/**
 * The purpose of CcLClient to is provide a way to get data directly from the Millennium database. This class
 * works by creating a new XMLCCLREQUEST object and passing in the CCL program name and any appropriate
 * parameters.
 *
 * XMLCCLREQUEST Example:
 * var requestSync = new window.external.XMLCclRequest();
 * requestSync.open("GET","ASD_SMART_ON_FHIR_UTILITIES:dba", false);
 * requestSync.send('MINE');
 * var data = requestSync.responseText
 *
 * More information on XMLCCLREQUEST can be found here:
 * https://wiki.cerner.com/display/public/MPDEVWIKI/XMLCCLREQUEST
 *
 * In order to retrieve the data from Millennium as quickly as possible, a helper prompt program has
 * been created. The program name is ASD_SMART_ON_FHIR_UTILITIES and is the default for getCclData. This program
 * is a wrapper around custom CCL queries that perform very specific actions. For example, getting a person's email
 * address.
 *
 * To see what type of data is available to return in ASD_SMART_ON_FHIR_UTILITIES please visit the repository:
 * https://github.cerner.com/application-services-development/asd-smart-on-fhir-utilities
 */
class CclClient {
  constructor() {
    this.readyStates = Object.freeze({
      uninitialized: 0,
      loading: 1,
      loaded: 2,
      interactive: 3,
      completed: 4,
    });
    this.statuses = Object.freeze({
      success: 200,
      methodNotAllowed: 405,
      invalidState: 409,
      nonFatalError: 492,
      memoryError: 493,
      internalServerException: 500,
    });
  }

  /**
   * Use the XMLCclRequest object and send a request to Millennium.
   * @param {string} args The args that get passed into the prompt program
   * @param {string} program The name of the prompt program that will be executed
   * @return {Promise<string>} The response text of the executed program
   */
  getCclData(args, program) {
    return new Promise((resolve, reject) => {
      // It's not an error if it's not available
      if (!window.external.XMLCclRequest) {
        return resolve(false);
      }

      const cclRequest = window.external.XMLCclRequest();

      cclRequest.onreadystatechange = () => {
        if (cclRequest.readyState !== this.readyStates.completed) {
          return;
        }
        if (cclRequest.status === this.statuses.success) {
          resolve(cclRequest.responseText);
        } else {
          reject(new Error(`A ${cclRequest.status} error occurred in XMLCclRequest: ${cclRequest.statusText}`));
        }
      };

      cclRequest.open('GET', program, true);
      cclRequest.send(`"MINE", ${args}`);
    });
  }

  /**
   * Execute asd_smart_on_fhir_utilities by calling getCclData and auto populating the helper program
   * @param {string} sub The subroutine key (available options defined in the CCL program)
   * @param {string} arg The argument to send to the subroutine
   * @returns {Promise<string>} The string VALUE of the parsed JSON response of ASD_SMART_ON_FHIR_UTILITIES
   */
  runFhirUtilities(sub, arg = null) {
    return new Promise((resolve, reject) => {
      const onSuccess = (json) => {
        if (json) {
          const obj = JSON.parse(json);
          resolve(obj.REPLY.STATUS === 'SUCCESS' ? obj.REPLY.VALUE : '');
        } else {
          resolve('');
        }
      };

      const onReject = (error) => reject(error);

      const promptArgs = arg === null ? `"${sub}"` : `"${sub}", "${arg}"`;
      return this.getCclData(promptArgs, 'ASD_SMART_ON_FHIR_UTILITIES:dba').then(onSuccess, onReject);
    });
  }

  /**
   * Gets user details about a person from Millennium
   * @return {Promise<object>} An object with several person fields
   */
  getUserDetails() {
    return new Promise((resolve, reject) => this.runFhirUtilities('USER').then(
      (json) => resolve(json ? JSON.parse(json).REPLY : {}),
      (error) => reject(error)
    ));
  }
}

export default CclClient;
/** @namespace H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.DocumentExportPageJGU'] = (function () {
  return {
    1: {
      4: function (parameters, finished, extras) {
        extras = extras || {};
        extras.metadata = extras.metadata || {};

        if (parameters && parameters.title) {
          extras.metadata.title = parameters.title.replace(/<[^>]*>?/g, '');
        }
        else if (!extras.metadata.title) {
          extras.metadata.title = 'Document Export Page (JGU)';
        }

        finished(null, parameters, extras);
      }
    }
  };
})();

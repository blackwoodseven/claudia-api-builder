var PathParser = function (params) {
    this.rules = [];
    this.params = params;
}
PathParser.prototype = (function () {
  function getParamsFromRule(rule, pathParts, queryParts) {
      var params = {};
      var missingParams = {};

      // Don't match if fixed rule is longer than path
      if (rule.parts.length < pathParts.length) return false;

      // Parse path components
      for (var i = 0; i < rule.parts.length; i++) {
          var rulePart = rule.parts[i];
          var part = pathParts[i];

          if (part !== undefined) {
              // Assign part to named parameter
              if (rulePart.charAt(0) == ':') {
                  params[rulePart.substr(1)] = part;
                  continue;
              }
              // If explicit parts differ, no match
              else if (rulePart !== part) {
                  return false;
              }
          }
          // If no path part and not a named parameter, no match
          else if (rulePart.charAt(0) != ':') {
              return false;
          }
          else {
              missingParams[rulePart.substr(1)] = true;
          }
      }

      // Parse query strings
      for (var i=0; i<queryParts.length; i++) {
          var nameValue = queryParts[i].split('=', 2);
          var key = nameValue[0];
          // But ignore empty parameters and don't override named parameters
          if (nameValue.length == 2 && !params[key] && !missingParams[key]) {
              params[key] = nameValue[1];
          }
      }

      return params;
  }

  return {
      add: function (route, handler) {
          this.rules.push({
              parts: route.replace(/^\//, '').split('/'),
              handler: handler
          });
      },

      run: function (url) {
          if (url.length) {
              url = url
                  // Remove redundant slashes
                  .replace(/\/+/g, '/')
                  // Strip leading and trailing '/' (at end or before query string)
                  .replace(/^\/|\/($|\?)/, '')
                  // Strip fragment identifiers
                  .replace(/#.*$/, '');
          }

          var urlSplit = url.split('?', 2);
          var pathParts = urlSplit[0].split('/', 50);
          var queryParts = urlSplit[1] ? urlSplit[1].split('&', 50) : [];

          for (var i=0; i < this.rules.length; i++) {
              var rule = this.rules[i];
              var params = getParamsFromRule(rule, pathParts, queryParts);
              if (params) {
                  params.url = url;
                  // Automatic parameter assignment
                  if (this.params) {
                      for (var param in params) {
                          this.params[param] = params[param];
                      }
                  }
                  // Call handler with 'this' bound to parameter object
                  if (rule.handler) {
                      rule.handler.call(this, params);
                  }
                  return true;
              }
          }
          return false;
      }
  };
})();

return PathParser;

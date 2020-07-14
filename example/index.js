/*
  example - index.js
*/

(function() {

  var inputEl = document.getElementById('file-input');
  
  inputEl.addEventListener('change', function (event) {
    if (event.target.files.length > 0) {

      var file = event.target.files[0];

      getMp4Info(file, function (err, result) {
        printAtoms(result);
      });
    }
  });

})();

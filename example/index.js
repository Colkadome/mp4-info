/*
  example - index.js
*/

(function() {

  var inputEl = document.getElementById('file-input');
  var outputEl = document.getElementById('mp4-output');
  
  inputEl.addEventListener('change', function (event) {
    if (event.target.files.length > 0) {

      var file = event.target.files[0];

      getMp4Info(file, function (err, result) {
        if (err) {
          outputEl.innerText = err;
        } else {
          outputEl.innerText = JSON.stringify(result, null, 2);
        }
      });

    }
  });

})();

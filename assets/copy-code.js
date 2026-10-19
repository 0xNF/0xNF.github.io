document.querySelectorAll('.markdown-body pre:not(.mermaid)').forEach(function (pre) {
  var btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.type = 'button';
  btn.textContent = 'Copy';
  btn.onclick = function () {
    navigator.clipboard.writeText(pre.innerText).then(function () {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    });
  };
  pre.style.position = 'relative';
  pre.appendChild(btn);
});

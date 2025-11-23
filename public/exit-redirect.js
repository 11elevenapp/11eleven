(function () {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('do');

  // Pull base64 card from sessionStorage set earlier
  const encoded = sessionStorage.getItem('lastGeneratedCard');

  if (!encoded) {
    alert("Missing prophecy card.");
    return;
  }

  // Open viewcard outside IG
  const url = `https://11eleven.app/viewcard.html?img=${encodeURIComponent(encoded)}&a=${action}`;
  window.location.replace(url);
})();

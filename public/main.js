[...document.getElementsByClassName('pagination-info')]
  .forEach(el=> {
    [...el.querySelectorAll('a')].forEach(a=> {
      const baseUri = window.location.origin;
      const currentSearch = window.location.search;
      const page = a.attributes.getNamedItem('data-page').value;
      if (!currentSearch) {
        a.href = baseUri + '?page=' + page;
      } else {
        const reg = /page=([0-9]+)/;
        const newSearch = reg.test(currentSearch) ? currentSearch.replace(reg, 'page=' + page) : currentSearch + '&page=' + page;
        a.href = baseUri + newSearch;
      }
    });
  });
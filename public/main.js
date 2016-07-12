(function () {
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

  [...document.querySelectorAll('li[role="menuitem"] > button')]
    .forEach(el=> {
      const [action,model,id] = el.name.split('-');
      if (action === 'delete') {
        el.addEventListener('click', function () {
          let current = el;
          while (current.nodeName !== 'LI' || current.hasAttribute('role')) {
            current = current.parentNode;
          }
          const deleteRequest = new XMLHttpRequest();
          deleteRequest.addEventListener("load", function () {
            if (this.status < 400) {
              current.className += ' dying';
              setTimeout(function () {
                current.parentNode.removeChild(current);
              }, 1000);
            } else {
              alert('something went wrong: ' + this.responseText);
            }
          });
          deleteRequest.open(action.toUpperCase(), ['http://localhost:3000', model, id].join('/'));
          deleteRequest.send();
        });
      }
    });

  const commentButton = document.getElementById('add-comment');

  function createLabelField (field, inputType, placeholder) {
    const label = document.createElement('LABEL');
    const span = document.createElement('SPAN');
    span.textContent = field;
    const input = document.createElement('INPUT');
    input.setAttribute('type', inputType || 'text');
    input.setAttribute('required', true);
    input.setAttribute('name', field);
    input.setAttribute('id', field);
    input.setAttribute('placeholder', placeholder);

    label.appendChild(span);
    label.appendChild(input);
    return label;
  }

  if (commentButton) {
    commentButton.addEventListener('click', function () {
      const [role,postId] = commentButton.name.split('-');
      const csrf = commentButton.dataset.csrf;

      const form = document.createElement('FORM');
      form.className = 'edit-post flex-column';
      form.setAttribute('action', '/posts/' + postId + '/comments');
      form.setAttribute('method', 'POST');

      const usernameLabel = createLabelField('username', 'text', 'ex: Lorenzofox3');
      const emailLabel = createLabelField('email', 'email', 'foo@bar.com');
      const messageLabel = createLabelField('message', 'text', 'ex: that is a great post');
      const send = document.createElement('BUTTON');
      const csrfInput = document.createElement('input');
      csrfInput.setAttribute('hidden', true);
      csrfInput.setAttribute('name', '_csrf');
      csrfInput.setAttribute('value', csrf);
      send.innerHTML = 'Send';

      form.appendChild(csrfInput);
      form.appendChild(usernameLabel);
      form.appendChild(emailLabel);
      form.appendChild(messageLabel);
      form.appendChild(send);

      const commentHeader = document.querySelector('#comments > header');
      commentHeader.appendChild(form);

      usernameLabel.lastChild.setAttribute('autofocus', true);

      commentButton.parentNode.removeChild(commentButton);
    });
  }
})();
(function() {
    const app = document.querySelector('.app');
    const socket = io();

    let uname;

    const joinUserBtn = app.querySelector('.join-screen #join-user');
    const messageInput = app.querySelector('.chat-screen #message-input');
    const sendMessageBtn = app.querySelector('.chat-screen #send-message');
    const exitChatBtn = app.querySelector('.chat-screen #exit-chat');
    const joinUserInput = app.querySelector('.join-screen #username');
    const errorMessage = app.querySelector('#error-message');

    function joinUser() {
        let username = joinUserInput.value.trim();

        // Check username length
        if (username.length === 0 || username.length > 28) {
            errorMessage.textContent = 'Имя должно быть от 1 до 28 символов.';
            return;
        }

        socket.emit('newuser', username);
        uname = username;

        app.querySelector('.join-screen').classList.remove('active');
        app.querySelector('.chat-screen').classList.add('active');
    }

    function sendMessage() {
        let message = messageInput.value.trim();

        if (message.length === 0 || message.length > 200) {
            return;
        }

        renderMessage('my', {
            username: uname,
            text: message
        });

        socket.emit('chat', {
            username: uname,
            text: message
        });

        messageInput.value = '';
    }

    function renderMessage(type, message) {
        const messageContainer = app.querySelector('.chat-screen .messages');
        const messageElement = document.createElement('div');

        if (type === 'my') {
            messageElement.classList.add('message', 'my-message');
            messageElement.innerHTML = `
                <div>
                    <div class="name">Ты</div>
                    <div class="text">${message.text}</div>
                </div>
            `;
        } else if (type === 'other') {
            messageElement.classList.add('message', 'other-message');
            messageElement.innerHTML = `
                <div>
                    <div class="name">${message.username}</div>
                    <div class="text">${message.text}</div>
                </div>
            `;
        } else if (type === 'update') {
            messageElement.classList.add('update');
            messageElement.innerText = message;
        }

        messageContainer.appendChild(messageElement);
        messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
    }

    joinUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinUser();
        }
    });

    joinUserBtn.addEventListener('click', joinUser);
    sendMessageBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    exitChatBtn.addEventListener('click', () => {
        socket.emit('exituser', uname);
        window.location.reload();
    });

    socket.on('usercount', (count) => {
        const userCountElement = document.querySelector('.user-count');
        if (userCountElement) {
            userCountElement.textContent = `Онлайн: ${count}`;
        }
    });

    socket.on('update', (update) => {
        renderMessage('update', update);
    });

    socket.on('chat', (message) => {
        renderMessage('other', message);
    });
})();

(function () {
  const app = document.querySelector(".app");
  const socket = io();

  let uname;
  let frequentlyUsedWords = {};
  let serverWords = [];
  let newMessages = 0; // Counter for new messages

  const joinUserBtn = app.querySelector(".join-screen #join-user");
  const messageInput = app.querySelector(".chat-screen #message-input");
  const sendMessageBtn = app.querySelector(".chat-screen #send-message");
  const exitChatBtn = app.querySelector(".chat-screen #exit-chat");
  const joinUserInput = app.querySelector(".join-screen #username");
  const errorMessage = app.querySelector("#error-message");
  const suggestionsBox = document.createElement("div");
  const cornerLogo = document.querySelector(".corner-logo");

  suggestionsBox.classList.add("suggestions");
  app.querySelector(".typebox").appendChild(suggestionsBox);

  const scrollToBottomButton = document.createElement("div");
  scrollToBottomButton.id = "scroll-to-bottom";
  scrollToBottomButton.classList.add("scroll-to-bottom");
  scrollToBottomButton.style.display = "none";
  scrollToBottomButton.textContent = "↓ 0";
  app.querySelector(".chat-screen").appendChild(scrollToBottomButton);

  function joinUser() {
    let username = joinUserInput.value.trim();

    if (username.length === 0 || username.length > 28) {
      errorMessage.textContent = "Имя должно быть от 1 до 28 символов.";
      return;
    }

    socket.emit("newuser", username);
    uname = username;

    const joinScreen = app.querySelector(".join-screen");
    const chatScreen = app.querySelector(".chat-screen");

    joinScreen.classList.add("fade-out");

    setTimeout(() => {
      joinScreen.classList.remove("active", "fade-out");
      chatScreen.classList.add("active", "fade-in");
    }, 300);

    if (window.innerWidth <= 768) {
      cornerLogo.style.opacity = "0";
    }
  }

  function sendMessage() {
    let message = messageInput.value.trim();

    if (message.length === 0 || message.length > 200) {
      return;
    }

    renderMessage("my", {
      username: uname,
      text: message,
    });

    socket.emit("chat", {
      username: uname,
      text: message,
    });

    saveFrequentlyUsedWords(message);
    messageInput.value = "";
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
  }

  function renderMessage(type, message) {
    const messageContainer = app.querySelector(".chat-screen .messages");
    const messageElement = document.createElement("div");

    const currentTime = new Date().toLocaleTimeString();

    if (type === "my") {
      messageElement.classList.add("message", "my-message");
      messageElement.innerHTML = `
        <div>
          <div class="name">Ты</div>
          <div class="text">${message.text}</div>
          <div class="timestamp">${currentTime}</div>
        </div>
      `;
    } else if (type === "other") {
      messageElement.classList.add("message", "other-message", "new");
      messageElement.innerHTML = `
        <div>
          <div class="name">${message.username}</div>
          <div class="text">${message.text}</div>
          <div class="timestamp">${currentTime}</div>
        </div>
      `;

      if (!isScrolledToBottom()) {
        newMessages++;
      }
    } else if (type === "update") {
      messageElement.classList.add("update");
      messageElement.innerText = message;
    }

    messageContainer.appendChild(messageElement);

    if (type === "my") {
      messageContainer.scrollTop =
        messageContainer.scrollHeight - messageContainer.clientHeight;
    }

    updateScrollToBottomButton();
  }

  function isScrolledToBottom() {
    const messages = document.querySelector(".messages");
    return messages.scrollTop === messages.scrollHeight - messages.clientHeight;
  }

  function scrollToBottom() {
    const messages = document.querySelector(".messages");
    messages.scrollTop = messages.scrollHeight;
    newMessages = 0; // Reset new messages count
    updateScrollToBottomButton(); // Update the button text and visibility
  }

  function updateScrollToBottomButton() {
    const messages = document.querySelector(".messages");
    if (isScrolledToBottom()) {
      scrollToBottomButton.style.display = "none";
      newMessages = 0; // Reset new messages count when scrolled to bottom
    } else {
      scrollToBottomButton.style.display = newMessages > 0 ? "block" : "none";
      scrollToBottomButton.textContent = `↓ ${newMessages}`;
    }
  }

  document.querySelector(".messages").addEventListener("scroll", () => {
    const messages = document.querySelector(".messages");
    const newMessageElements = messages.querySelectorAll(
      ".message.other-message.new"
    );

    newMessageElements.forEach((messageElement) => {
      const messageRect = messageElement.getBoundingClientRect();
      const messagesRect = messages.getBoundingClientRect();

      if (
        messageRect.top >= messagesRect.top &&
        messageRect.bottom <= messagesRect.bottom
      ) {
        messageElement.classList.remove("new");
        newMessages--;
      }
    });

    updateScrollToBottomButton();
  });

  scrollToBottomButton.addEventListener("click", scrollToBottom);

  function saveFrequentlyUsedWords(message) {
    const words = message.split(" ");

    if (Object.keys(frequentlyUsedWords).length >= 30) {
      const minCount = Math.min(...Object.values(frequentlyUsedWords));

      const minCountWords = Object.keys(frequentlyUsedWords).filter(
        (word) => frequentlyUsedWords[word] === minCount
      );

      const oldestWord = minCountWords.reduce((a, b) =>
        frequentlyUsedWords[a] < frequentlyUsedWords[b] ? a : b
      );

      delete frequentlyUsedWords[oldestWord];
    }

    words.forEach((word) => {
      if (frequentlyUsedWords[word]) {
        frequentlyUsedWords[word]++;
      } else {
        frequentlyUsedWords[word] = 1;
      }
    });

    localStorage.setItem(
      "frequentlyUsedWords",
      JSON.stringify(frequentlyUsedWords)
    );
  }

  function loadFrequentlyUsedWords() {
    const savedWords = localStorage.getItem("frequentlyUsedWords");
    if (savedWords) {
      frequentlyUsedWords = JSON.parse(savedWords);
    }
  }

  async function loadServerWords() {
    try {
      const response = await fetch("/words");
      const data = await response.json();

      serverWords = data;
    } catch (error) {
      console.error("Ошибка при загрузке слов с сервера:", error);
    }
  }

  let lastInput = "";

  function showSuggestions(input) {
    if (input.trim() === "") {
      suggestionsBox.style.display = "none";
      return;
    }

    if (input !== lastInput && input.trim().slice(-1) !== " ") {
      lastInput = input;

      const words = input.trim().split(" ");
      const lastWord = words[words.length - 1];

      const getSuggestions = (source) =>
        source.filter((word) => word.startsWith(lastWord)).slice(0, 3);

      const frequentlyUsedSuggestions = getSuggestions(
        Object.keys(frequentlyUsedWords)
      );
      const serverSuggestions = getSuggestions(serverWords);

      const suggestions = frequentlyUsedSuggestions
        .concat(serverSuggestions)
        .slice(0, 3);

      suggestionsBox.innerHTML = "";
      if (suggestions.length > 0) {
        suggestionsBox.style.display = "block";

        const suggestionsContainer = document.createElement("div");
        suggestionsContainer.classList.add("suggestions-container");

        suggestions.forEach((suggestion) => {
          const suggestionElement = document.createElement("span");
          suggestionElement.classList.add("suggestion");
          suggestionElement.textContent = suggestion;
          suggestionElement.addEventListener("click", () => {
            insertSuggestion(suggestion);
          });
          suggestionsContainer.appendChild(suggestionElement);
        });

        suggestionsBox.appendChild(suggestionsContainer);
      } else {
        suggestionsBox.style.display = "none";
      }
    }
  }

  function insertSuggestion(suggestion) {
    const words = lastInput.trim().split(" ");
    words[words.length - 1] = suggestion;
    messageInput.value = words.join(" ");
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
  }

  messageInput.addEventListener("input", (e) => {
    showSuggestions(e.target.value);
  });

  joinUserInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinUser();
    }
  });

  joinUserBtn.addEventListener("click", joinUser);
  sendMessageBtn.addEventListener("click", sendMessage);

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const firstSuggestion = suggestionsBox.querySelector(".suggestion");
      if (firstSuggestion) {
        insertSuggestion(firstSuggestion.textContent);
      }
    }
  });

  exitChatBtn.addEventListener("click", () => {
    socket.emit("exituser", uname);
    const chatScreen = app.querySelector(".chat-screen");
    chatScreen.classList.add("fade-out");
    setTimeout(() => {
      chatScreen.classList.remove("active", "fade-out");
      cornerLogo.style.opacity = "1";
      window.location.reload();
    }, 300);
  });

  socket.on("usercount", (count) => {
    const userCountElement = document.querySelector(".user-count");
    if (userCountElement) {
      userCountElement.textContent = `Онлайн: ${count}`;
    }
  });

  socket.on("usernameExists", (username) => {
    alert(
      `Имя пользователя "${username}" уже занято. Пожалуйста, выберите другое имя.`
    );

    location.reload();
  });

  socket.on("update", (update) => {
    renderMessage("update", update);
  });

  socket.on("chat", (message) => {
    renderMessage("other", message);
    updateScrollToBottomButton();
  });

  function openWallpaperDialog() {
    const wallpaperChoice = prompt("Выберите обои: 1, 2", "");
    if (wallpaperChoice === "1" || wallpaperChoice === "2") {
      const wallpaperPath = `backgrounds/${wallpaperChoice}.png`;
      document.querySelector(
        ".messages"
      ).style.backgroundImage = `url("${wallpaperPath}")`;
      localStorage.setItem("selectedWallpaper", wallpaperPath);
    } else {
      alert("Неверный выбор обоев.");
    }
  }

  document
    .getElementById("change-wallpaper")
    .addEventListener("click", openWallpaperDialog);

  window.addEventListener("load", async function () {
    const selectedWallpaper = localStorage.getItem("selectedWallpaper");
    if (selectedWallpaper) {
      document.querySelector(
        ".messages"
      ).style.backgroundImage = `url("${selectedWallpaper}")`;
    }

    loadFrequentlyUsedWords();
    loadServerWords();
  });
})();

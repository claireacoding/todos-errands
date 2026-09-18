(function () {
  "use strict";

  var STORAGE_KEY = "todos-errands-items";
  var TYPE_LABELS = {
    errand: "Errand",
    home: "Home",
    other: "Other",
  };

  var form = document.getElementById("add-form");
  var textInput = document.getElementById("item-text");
  var formError = document.getElementById("form-error");
  var storageBanner = document.getElementById("storage-banner");
  var listEl = document.getElementById("item-list");
  var emptyState = document.getElementById("empty-state");
  var emptyTitle = document.getElementById("empty-title");
  var emptyCopy = document.getElementById("empty-copy");
  var countsEl = document.getElementById("counts");
  var liveStatus = document.getElementById("live-status");
  var clearDoneButton = document.getElementById("clear-done");
  var filterButtons = document.querySelectorAll("[data-filter]");

  var items = loadItems();
  var activeFilter = "all";

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    addItem();
  });

  listEl.addEventListener("change", function (event) {
    var toggle = event.target.closest("[data-action='toggle']");
    if (!toggle) return;
    var row = event.target.closest("[data-id]");
    if (!row) return;
    toggleItem(row.getAttribute("data-id"));
  });

  listEl.addEventListener("click", function (event) {
    var removeButton = event.target.closest("[data-action='delete']");
    if (!removeButton) return;
    var row = event.target.closest("[data-id]");
    if (!row) return;
    deleteItem(row.getAttribute("data-id"));
  });

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.getAttribute("data-filter");
      filterButtons.forEach(function (chip) {
        var isActive = chip === button;
        chip.classList.toggle("is-active", isActive);
        chip.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      render();
    });
  });

  clearDoneButton.addEventListener("click", function () {
    var remaining = items.filter(function (item) {
      return !item.done;
    });
    var removed = items.length - remaining.length;
    items = remaining;
    persist();
    announce(removed === 1 ? "Cleared 1 finished item." : "Cleared " + removed + " finished items.");
    render();
  });

  render();

  function addItem() {
    var text = textInput.value.trim();
    if (!text) {
      showFormError("Type what you need to do first.");
      textInput.focus();
      return;
    }

    hideFormError();

    var typeInput = form.querySelector("input[name='type']:checked");
    var type = typeInput && TYPE_LABELS[typeInput.value] ? typeInput.value : "other";

    items.unshift({
      id: createId(),
      text: text,
      type: type,
      done: false,
      createdAt: Date.now(),
    });

    persist();
    textInput.value = "";
    textInput.focus();
    announce("Added " + TYPE_LABELS[type].toLowerCase() + ": " + text);
    render();
  }

  function toggleItem(id) {
    var item = findItem(id);
    if (!item) return;
    item.done = !item.done;
    persist();
    announce(item.done ? "Marked as done: " + item.text : "Marked as still open: " + item.text);
    render();
  }

  function deleteItem(id) {
    var item = findItem(id);
    if (!item) return;
    items = items.filter(function (entry) {
      return entry.id !== id;
    });
    persist();
    announce("Removed: " + item.text);
    render();
  }

  function findItem(id) {
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function visibleItems() {
    if (activeFilter === "all") return items.slice();
    return items.filter(function (item) {
      return item.type === activeFilter;
    });
  }

  function render() {
    var visible = visibleItems().sort(function (a, b) {
      if (a.done === b.done) return b.createdAt - a.createdAt;
      return a.done ? 1 : -1;
    });

    listEl.innerHTML = "";
    visible.forEach(function (item) {
      listEl.appendChild(renderItem(item));
    });

    var openCount = items.filter(function (item) {
      return !item.done;
    }).length;
    var doneCount = items.length - openCount;
    var visibleDone = visible.filter(function (item) {
      return item.done;
    }).length;

    countsEl.textContent = countLabel(openCount, doneCount);
    clearDoneButton.hidden = visibleDone === 0;

    if (items.length === 0) {
      emptyState.hidden = false;
      emptyTitle.textContent = "The list is empty";
      emptyCopy.textContent =
        "Add an errand, a home chore, or anything else you need to remember.";
      return;
    }

    if (visible.length === 0) {
      emptyState.hidden = false;
      emptyTitle.textContent = "Nothing in " + filterNoun(activeFilter);
      emptyCopy.textContent = "Add one above, or choose another filter.";
      return;
    }

    if (openCount === 0 && activeFilter === "all") {
      emptyState.hidden = true;
      return;
    }

    emptyState.hidden = true;
  }

  function renderItem(item) {
    var li = document.createElement("li");
    li.className = "item" + (item.done ? " is-done" : "");
    li.setAttribute("data-id", item.id);

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "toggle";
    checkbox.checked = item.done;
    checkbox.setAttribute("data-action", "toggle");
    checkbox.setAttribute("aria-label", "Mark as done: " + item.text);

    var body = document.createElement("div");
    body.className = "item-body";

    var text = document.createElement("p");
    text.className = "item-text";
    text.textContent = item.text;

    var tag = document.createElement("span");
    tag.className = "tag tag-" + item.type;
    tag.textContent = TYPE_LABELS[item.type] || "Other";

    body.appendChild(text);
    body.appendChild(tag);

    var removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "icon-button";
    removeButton.setAttribute("data-action", "delete");
    removeButton.setAttribute("aria-label", "Remove " + item.text);
    removeButton.textContent = "Remove";

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(removeButton);
    return li;
  }

  function countLabel(openCount, doneCount) {
    if (items.length === 0) return "Nothing saved yet";
    var openPart = openCount === 1 ? "1 open" : openCount + " open";
    var donePart = doneCount === 1 ? "1 done" : doneCount + " done";
    return openPart + " · " + donePart;
  }

  function filterNoun(filter) {
    if (filter === "errand") return "errands";
    if (filter === "home") return "home tasks";
    if (filter === "other") return "other tasks";
    return "this filter";
  }

  function showFormError(message) {
    formError.hidden = false;
    formError.textContent = message;
    textInput.setAttribute("aria-invalid", "true");
    textInput.setAttribute("aria-describedby", "form-error");
  }

  function hideFormError() {
    formError.hidden = true;
    formError.textContent = "";
    textInput.removeAttribute("aria-invalid");
    textInput.removeAttribute("aria-describedby");
  }

  function announce(message) {
    liveStatus.textContent = message;
  }

  function persist() {
    if (!saveItems(items)) {
      storageBanner.hidden = false;
    } else {
      storageBanner.hidden = true;
    }
  }

  function loadItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (item) {
          return item && typeof item.text === "string" && TYPE_LABELS[item.type];
        })
        .map(function (item) {
          return {
            id: String(item.id || createId()),
            text: item.text,
            type: item.type,
            done: Boolean(item.done),
            createdAt: Number(item.createdAt) || Date.now(),
          };
        });
    } catch (error) {
      storageBanner.hidden = false;
      return [];
    }
  }

  function saveItems(nextItems) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
      return true;
    } catch (error) {
      return false;
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "item-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }
})();

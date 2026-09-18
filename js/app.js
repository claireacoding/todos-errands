(function () {
  "use strict";

  var STORAGE_KEY = "todos-errands-items";
  var TYPE_LABELS = {
    errand: "Errand",
    home: "Home",
    other: "Other",
  };
  var WHEN_LABELS = {
    today: "Today",
    later: "Later",
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
  var typeFilterButtons = document.querySelectorAll("[data-type-filter]");
  var whenFilterButtons = document.querySelectorAll("[data-when-filter]");

  var items = loadItems();
  var typeFilter = "all";
  var whenFilter = "all";

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
    if (removeButton) {
      var removeRow = event.target.closest("[data-id]");
      if (!removeRow) return;
      deleteItem(removeRow.getAttribute("data-id"));
      return;
    }

    var editButton = event.target.closest("[data-action='edit']");
    if (!editButton) return;
    var editRow = event.target.closest("[data-id]");
    if (!editRow) return;
    startEdit(editRow);
  });

  typeFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      typeFilter = button.getAttribute("data-type-filter");
      typeFilterButtons.forEach(function (chip) {
        var isActive = chip === button;
        chip.classList.toggle("is-active", isActive);
        chip.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      render();
    });
  });

  whenFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      whenFilter = button.getAttribute("data-when-filter");
      whenFilterButtons.forEach(function (chip) {
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
      showFormError("What's next on the list? Start here first.");
      textInput.focus();
      return;
    }

    hideFormError();

    var typeInput = form.querySelector("input[name='type']:checked");
    var type = typeInput && TYPE_LABELS[typeInput.value] ? typeInput.value : "other";
    var whenInput = form.querySelector("input[name='when']:checked");
    var when = whenInput && WHEN_LABELS[whenInput.value] ? whenInput.value : "today";

    items.unshift({
      id: createId(),
      text: text,
      type: type,
      when: when,
      done: false,
      createdAt: Date.now(),
    });

    persist();
    textInput.value = "";
    textInput.focus();
    announce("Added " + TYPE_LABELS[type].toLowerCase() + " for " + WHEN_LABELS[when].toLowerCase() + ": " + text);
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

  function startEdit(row) {
    var id = row.getAttribute("data-id");
    var item = findItem(id);
    if (!item) return;
    if (row.querySelector(".item-edit")) return;

    var textButton = row.querySelector("[data-action='edit']");
    if (!textButton) return;

    var original = item.text;
    var input = document.createElement("input");
    input.type = "text";
    input.className = "item-edit";
    input.value = original;
    input.maxLength = 140;
    input.setAttribute("aria-label", "Edit task");

    textButton.replaceWith(input);
    input.focus();
    input.select();

    var finished = false;

    function finish(shouldSave) {
      if (finished) return;
      finished = true;

      var next = input.value.trim();
      if (shouldSave && next && next !== original) {
        item.text = next;
        persist();
        announce("Updated to: " + next);
      } else if (!shouldSave) {
        announce("Edit cancelled.");
      }

      var button = makeTextButton(item);
      if (input.parentNode) input.replaceWith(button);
      var checkbox = row.querySelector(".toggle");
      var remove = row.querySelector("[data-action='delete']");
      if (checkbox) checkbox.setAttribute("aria-label", "Mark as done: " + item.text);
      if (remove) remove.setAttribute("aria-label", "Remove " + item.text);
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });

    input.addEventListener("blur", function () {
      finish(true);
    });
  }

  function makeTextButton(item) {
    var textButton = document.createElement("button");
    textButton.type = "button";
    textButton.className = "item-text";
    textButton.setAttribute("data-action", "edit");
    textButton.setAttribute("aria-label", "Edit " + item.text);
    textButton.textContent = item.text;
    return textButton;
  }

  function findItem(id) {
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function visibleItems() {
    return items.filter(function (item) {
      var typeOk = typeFilter === "all" || item.type === typeFilter;
      var whenOk = whenFilter === "all" || item.when === whenFilter;
      return typeOk && whenOk;
    });
  }

  function render() {
    var visible = visibleItems().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.when !== b.when) return a.when === "today" ? -1 : 1;
      return b.createdAt - a.createdAt;
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
      emptyTitle.textContent = "Nothing in " + filterNoun();
      emptyCopy.textContent = "Add one above, or choose another filter.";
      return;
    }

    if (openCount === 0 && typeFilter === "all" && whenFilter === "all") {
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

    var tags = document.createElement("div");
    tags.className = "item-tags";

    var typeTag = document.createElement("span");
    typeTag.className = "tag tag-" + item.type;
    typeTag.textContent = TYPE_LABELS[item.type] || "Other";

    var whenTag = document.createElement("span");
    whenTag.className = "tag tag-" + item.when;
    whenTag.textContent = WHEN_LABELS[item.when] || "Later";

    tags.appendChild(typeTag);
    tags.appendChild(whenTag);

    body.appendChild(makeTextButton(item));
    body.appendChild(tags);

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

  function filterNoun() {
    var parts = [];
    if (typeFilter === "errand") parts.push("errands");
    else if (typeFilter === "home") parts.push("home tasks");
    else if (typeFilter === "other") parts.push("other tasks");
    if (whenFilter === "today") parts.push("today");
    else if (whenFilter === "later") parts.push("later");
    return parts.length ? parts.join(" · ") : "this filter";
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
            when: item.when === "today" ? "today" : "later",
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

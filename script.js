document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("login-form")) {
    initLoginPage();
  } else if (document.getElementById("recipes-container")) {
    initRecipesPage();
  }
});

function initLoginPage() {
  if (localStorage.getItem("userFirstName")) {
    window.location.href = "recipes.html";
    return;
  }

  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const messageContainer = document.getElementById("message-container");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showMessage("Username and password cannot be empty.", "error");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    showMessage("");

    try {
      const response = await fetch("https://dummyjson.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed!");
      }

      showMessage("Login successful! Redirecting...", "success");
      localStorage.setItem("userFirstName", data.firstName);
      localStorage.setItem("userToken", data.token);

      setTimeout(() => {
        window.location.href = "recipes.html";
      }, 1500);
    } catch (error) {
      console.error("Login Error:", error);
      showMessage(error.message, "error");
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  });

  function showMessage(message, type = "info") {
    messageContainer.textContent = message;
    messageContainer.className = `message ${type}`;
  }
}

function initRecipesPage() {
  const userFirstName = localStorage.getItem("userFirstName");
  if (!userFirstName) {
    alert("You must be logged in to view this page.");
    window.location.href = "login.html";
    return;
  }

  const userNameElement = document.getElementById("user-name");
  const logoutButton = document.getElementById("logout-button");
  const recipesContainer = document.getElementById("recipes-container");
  const searchInput = document.getElementById("search-input");
  const cuisineFilter = document.getElementById("cuisine-filter");
  const showMoreButton = document.getElementById("show-more-button");
  const loader = document.getElementById("loader");
  const errorMessageElement = document.getElementById("error-message");

  let allRecipes = [];
  let filteredRecipes = [];
  let uniqueCuisines = new Set();
  let recipesToShow = 9;
  userNameElement.textContent = userFirstName;

  logoutButton.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });

  async function fetchRecipes() {
    showLoader(true);
    try {
      const response = await fetch("https://dummyjson.com/recipes?limit=0");
      if (!response.ok) throw new Error("Failed to fetch recipes.");
      const data = await response.json();

      allRecipes = data.recipes;
      filteredRecipes = [...allRecipes];

      populateCuisineFilter();
      displayRecipes();
    } catch (error) {
      showError(error.message);
    } finally {
      showLoader(false);
    }
  }

  function displayRecipes() {
    recipesContainer.innerHTML = "";
    const recipesToDisplay = filteredRecipes.slice(0, recipesToShow);

    if (recipesToDisplay.length === 0) {
      recipesContainer.innerHTML =
        "<p>No recipes found matching your criteria.</p>";
    }

    recipesToDisplay.forEach((recipe) => {
      const card = document.createElement("div");
      card.className = "recipe-card";
      card.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.name}">
                <div class="card-content">
                    <h3>${recipe.name}</h3>
                    <p class="cuisine">${recipe.cuisine}</p>
                    <div class="details">
                        <span>🕒 ${recipe.cookTimeMinutes} min</span>
                        <span>🔥 ${recipe.difficulty}</span>
                    </div>
                    <div class="rating">${generateStars(recipe.rating)}</div>
                    <p class="ingredients"><b>Ingredients:</b> ${recipe.ingredients
                      .slice(0, 3)
                      .join(", ")}...</p>
                    <button class="view-recipe-btn" data-id="${
                      recipe.id
                    }">View Full Recipe</button>
                </div>
            `;
      recipesContainer.appendChild(card);
    });

    if (filteredRecipes.length > recipesToShow) {
      showMoreButton.style.display = "block";
    } else {
      showMoreButton.style.display = "none";
    }
  }

  function populateCuisineFilter() {
    allRecipes.forEach((recipe) => uniqueCuisines.add(recipe.cuisine));
    uniqueCuisines.forEach((cuisine) => {
      const option = document.createElement("option");
      option.value = cuisine;
      option.textContent = cuisine;
      cuisineFilter.appendChild(option);
    });
  }

  function handleFilterAndSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCuisine = cuisineFilter.value;

    filteredRecipes = allRecipes.filter((recipe) => {
      const matchesCuisine =
        !selectedCuisine || recipe.cuisine === selectedCuisine;

      const matchesSearch =
        !searchTerm ||
        recipe.name.toLowerCase().includes(searchTerm) ||
        recipe.cuisine.toLowerCase().includes(searchTerm) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
        recipe.ingredients.some((ing) =>
          ing.toLowerCase().includes(searchTerm)
        );

      return matchesCuisine && matchesSearch;
    });

    recipesToShow = 9;
    displayRecipes();
  }

  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleFilterAndSearch, 300);
  });

  cuisineFilter.addEventListener("change", handleFilterAndSearch);

  showMoreButton.addEventListener("click", () => {
    recipesToShow += 9;
    displayRecipes();
  });

  const modal = document.getElementById("recipe-modal");
  const modalBody = document.getElementById("modal-body");
  const closeModalButton = document.querySelector(".close-button");

  recipesContainer.addEventListener("click", (e) => {
    const viewButton = e.target.closest(".view-recipe-btn");
    if (viewButton) {
      const recipeId = parseInt(viewButton.dataset.id);
      const recipe = allRecipes.find((r) => r.id === recipeId);
      if (recipe) {
        showRecipeModal(recipe);
      }
    }
  });

  function showRecipeModal(recipe) {
    modalBody.innerHTML = `
            <h2>${recipe.name}</h2>
            <img src="${recipe.image}" alt="${
      recipe.name
    }" style="width:100%; max-height: 300px; object-fit: cover;">
            <p><strong>Cuisine:</strong> ${recipe.cuisine}</p>
            <p><strong>Difficulty:</strong> ${recipe.difficulty}</p>
            <p><strong>Cook Time:</strong> ${recipe.cookTimeMinutes} minutes</p>
            <p><strong>Rating:</strong> ${recipe.rating} / 5 (${
      recipe.reviewCount
    } reviews)</p>
            <h3>Ingredients:</h3>
            <ul>
                ${recipe.ingredients.map((ing) => `<li>${ing}</li>`).join("")}
            </ul>
            <h3>Instructions:</h3>
            <ol>
                ${recipe.instructions
                  .map((step) => `<li>${step}</li>`)
                  .join("")}
            </ol>
        `;
    modal.style.display = "block";
  }

  closeModalButton.onclick = () => (modal.style.display = "none");
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  function generateStars(rating) {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? "⭐" : "☆";
    }
    return stars;
  }

  function showLoader(isLoading) {
    loader.style.display = isLoading ? "block" : "none";
  }

  function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = "block";
  }

  fetchRecipes();
}

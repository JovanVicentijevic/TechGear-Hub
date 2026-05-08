
const IS_IN_SUBFOLDER = window.location.pathname.includes("pages");

const IMAGES_PATH = IS_IN_SUBFOLDER ? "../data/images.json" : "data/images.json";

const API_URL = IS_IN_SUBFOLDER
    ? "../data/products.json"
    : "data/products.json";

let currentImageIndex = 0;
let globalProducts = [];


let currentPage = 1;
const productsPerPage = 6;

/* 
    INIT
*/

$(document).ready(function () {
    
    $.ajax({
        url: IMAGES_PATH,
        method: "GET",
        dataType: "json",
        success: function(data) {
            
            $(".offer-img").attr("src", data.specialOffer.src);
            $(".offer-img").attr("alt", data.specialOffer.alt);

            data.categories.forEach(cat => {
        $(`#${cat.id}`).attr("src", cat.src);
    });


    if(data.heroImages && data.heroImages.length > 0) {
        $(".hero-section").css("background-image", `url('${data.heroImages[0]}')`);
        initHero(data.heroImages); 
    }

            if(data.heroImages && data.heroImages.length > 0) {
                $(".hero-section").css("background-image", `url('${data.heroImages[0]}')`);
            initHero(data.heroImages); 
            }
        },
        error: function(err) {
            console.error("Greška pri učitavanju images.json:", err);
            
            initHero([]); 
        }
    });

    renderNavigation();
    updateCartBadge();
    initHero();
    setupReadMore(); 

    if ($("#productsWrapper").length) {
        renderSortOptions();
        setupEventListeners();
        fetchProducts(); 
    }

    if ($("#cart-items-wrapper").length) {
        displayCart();
    }

    if ($("#orderForm").length) {
        console.log("Checkout form detected.");
        
    }
  
  $("#orderForm").on("submit", function(e) {
        e.preventDefault();
        
        const nameRegex = /^[A-Z][a-z]{2,15}$/;
        const phoneRegex = /^\+?[0-9]{9,15}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const addressRegex = /^[a-zA-Z0-9\s,.'-]{5,100}$/; 
        
        let isValid = true;

        
        $(".error-msg").text("");
        $(".form-control").removeClass("is-invalid");

        
        if (!emailRegex.test($("#email").val().trim())) {
            $("#emailErr").text("Invalid email address.");
            $("#email").addClass("is-invalid");
            isValid = false;
        }
        if (!nameRegex.test($("#firstName").val().trim())) {
            $("#firstNameErr").text("Required: Capital letter, 3-15 chars.");
            $("#firstName").addClass("is-invalid");
            isValid = false;
        }
        if (!phoneRegex.test($("#phone").val().trim())) {
            $("#phoneErr").text("Invalid phone number.");
            $("#phone").addClass("is-invalid");
            isValid = false;
        }
        if (!addressRegex.test($("#address").val().trim())) {
            $("#addressErr").text("Please enter a valid address (min 5 characters).");
            $("#address").addClass("is-invalid");
            isValid = false;
        }
        if ($("#paymentMethod").val() === "") {
            $("#paymentErr").text("Select payment method.");
            $("#paymentMethod").addClass("is-invalid");
            isValid = false;
        }

        if (isValid) {
            localStorage.removeItem("cart");
            
            showToast("Order Successful!", "success");
            
            $("#orderForm")[0].reset();
            
            updateCartBadge();
            displayCart();
        }
});
});


/* 
    NAV & CART
 */

function renderNavigation() {
    const navLinks = [
        { name: "Home", href: IS_IN_SUBFOLDER ? "../index.html" : "index.html" },
        { name: "Shop", href: IS_IN_SUBFOLDER ? "shop.html" : "pages/shop.html" },
        { name: "Author", href: IS_IN_SUBFOLDER ? "author.html" : "pages/author.html" },
        { name: "Documentation", href: IS_IN_SUBFOLDER ? "../doc.pdf" : "doc.pdf", isExternal: true},
        { name: "Cart", href: IS_IN_SUBFOLDER ? "cart.html" : "pages/cart.html", isCart: true }
    ];
    let html = navLinks.map(link => {
        // 1. Ovde dodajemo proveru za blank
        const target = link.isExternal ? 'target="_blank"' : '';

        if (link.isCart) {
            return `<li class="nav-item">
                        <a class="nav-link position-relative" href="${link.href}" ${target}>
                            <i class="fas fa-shopping-cart"></i> ${link.name}
                            <span id="cart-badge" class="badge bg-danger position-absolute top-0 start-100 translate-middle">0</span>
                        </a>
                    </li>`;
        }
        
        // 2. Dodajemo ${target} i ovde za obične linkove (prvenstveno za PDF)
        return `<li class="nav-item">
                    <a class="nav-link" href="${link.href}" ${target}>${link.name}</a>
                </li>`;
    }).join('');

    $("#nvb").html(html);
}


function renderTopPicks() {
    const container = $("#top-picks-container");
    if (!container.length) return; 

    $.ajax({
        url: "data/products.json", 
        method: "GET",
        dataType: "json",
        success: function (data) {
            const topProducts = data.slice(0, 3); 

            let html = "";
            topProducts.forEach(p => {
                html += `
                    <div class="col-md-4">
                        <div class="shop-card h-100 shadow-sm">
                            <div class="shop-card-img-wrapper">
                                <img src="${p.image}" alt="${p.name}" class="img-fluid">
                            </div>
                            <div class="shop-card-body text-center p-3">
                                <h5 class="product-title fw-bold">${p.name}</h5>
                                <p class="product-price text-danger fw-bold">$${p.price}</p>
                                <button class="btn-add-to-cart btn btn-dark rounded-0 w-100" onclick="addToCart(${p.id})">
                                    ADD TO CART
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
            container.html(html);
        },
        error: function () {
            container.html("<p class='text-center'>Failed to load top picks.</p>");
        }
    });
}

function displayCart() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const container = $("#cart-view");

    
    let tableHeader = `
        <div class="cart-panel">
            <table class="cart-table">
                <thead>
                    <tr>
                        <th colspan="2" class="text-center">Product Name & Details</th>
                        <th class="text-center">Price</th>
                        <th class="text-center">Quantity</th>
                        <th class="text-center">Total</th>
                        ${cart.length > 0 ? '<th></th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;

    let tableBody = "";
    let total = 0;

    if (cart.length === 0) {
        
        tableBody = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <span class="empty-cart-text">Cart is empty.</span>
                </td>
            </tr>
        `;
    } else {

        cart.forEach((item, index) => {
            let itemSubtotal = item.price * item.quantity;
            total += itemSubtotal;
            tableBody += `
                <tr>
                    <td class="text-center cart-img-cell">
                        <img src="${item.image}" alt="${item.name}">
                    </td>
                    <td>
                        <span class="fw-bold d-block">${item.name}</span>
                        <small class="text-muted">Ships from: US</small>
                    </td>
                    <td class="text-center">$${item.price.toFixed(0)}</td>
                    <td class="text-center">
                        <div class="d-flex align-items-center justify-content-center gap-2">
                            <button class="btn btn-sm btn-light border" onclick="changeQty(${index}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="btn btn-sm btn-light border" onclick="changeQty(${index}, 1)">+</button>
                        </div>
                    </td>
                    <td class="text-center fw-bold">$${itemSubtotal.toFixed(0)}</td>
                    <td class="text-center">
                        <button class="btn-remove-item border-0 bg-transparent" onclick="removeFromCart(${index})">
                            <i class="fas fa-times remove-icon"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    
    let fullHtml = `
        ${tableHeader}
        ${tableBody}
        </tbody>
        </table>

        <div class="row mt-4 align-items-center">
            <div class="col-md-6">
                <div class="promo-section">
                    <label class="promo-label">Promocode</label>
                    <input type="text" class="promo-input" placeholder="ABC">
                </div>
            </div>
            <div class="col-md-6 text-end">
                <p class="total-price-label">Total price</p>
                <h3 class="fw-bold">$${total.toFixed(2)}</h3>
            </div>
        </div>

        <div class="cart-footer-btns">
            <a href="shop.html" class="btn-back-shopping">BACK TO SHOPPING</a>
            <button class="btn-checkout-red" 
                    onclick="showCheckoutForm()" 
                    ${cart.length === 0 ? 'disabled' : ''}>
                CHECKOUT
            </button>
        </div>
        </div>
    `;

    container.html(fullHtml);
    updateCartBadge();
}
/* 
    READ MORE (Home Page)
 */

function setupReadMore() {
    $("#btnReadMore").on("click", function() {
        const extraText = $("#extraText");
        const button = $(this);

        // stop() sprečava bagove kod brzog kliktanja
        extraText.stop().slideToggle(400, function() {
            if (extraText.is(":visible")) {
                button.text("Read Less");
            } else {
                button.text("Read More");
            }
        });
    });
}

/* 
    HERO SLIDER
 */

function initHero(slike) {
    
    if (!slike || !Array.isArray(slike) || slike.length === 0) {
        return;
    }

    let i = 0;
    setInterval(() => {
        i = (i + 1) % slike.length;
        $(".hero-section").fadeOut(400, function() {
            $(this).css("background-image", `url('${slike[i]}')`).fadeIn(400);
        });
    }, 3000);
}

function changeHeroBackground() {
    $("#dynamic-hero").fadeOut(500, function() {
        $(this).css(
            "background-image",
            `url('${HERO_IMAGES[currentImageIndex]}')`
        ).fadeIn(500);
    });
}

function filterByCategory(catName) {
    const filtered = allProducts.filter(p => p.category.name === catName);
    renderProducts(filtered);
    
    $('html, body').animate({
        scrollTop: $("#productsWrapper").offset().top - 100
    }, 500);
}
/* 
    AJAX FETCH
 */

function fetchProducts() {
    return $.ajax({
        url: API_URL,
        method: "GET",
        dataType: "json",
        success: function (data) {
            
            globalProducts = data;
            renderFilterOptions(data);
            processProducts();
        },
        error: function () {
            $("#productsWrapper").html(`
                <div class="alert alert-danger">
                    Failed to load products.
                </div>
            `);
        }
    });
}

/* 
    PROCESS (Filter + Sort + Pagination)
 */

function processProducts() {
    let products = [...globalProducts];

    products = filterProducts(products);

    products = sortProducts(products);

    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / productsPerPage);

    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * productsPerPage;
    const paginatedProducts = products.slice(startIndex, startIndex + productsPerPage);

    renderProducts(paginatedProducts);
    renderPaginationButtons(totalPages);

    $("#productCount").text(`${totalProducts} products`);
}

/* 
    PAGINATION RENDER
 */

function renderPaginationButtons(totalPages) {
    let html = "";
    if (totalPages <= 1) {
        $("#paginationWrapper").html("");
        return;
    }

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link border-dark text-dark ${i === currentPage ? 'bg-dark text-white' : ''}" 
                   href="#" onclick="changePage(event, ${i})">
                    ${i}
                </a>
            </li>
        `;
    }

    $("#paginationWrapper").html(html);
}

function changePage(event, page) {
    event.preventDefault();
    currentPage = page;
    processProducts();
    $('html, body').animate({
        scrollTop: $("#productsWrapper").offset().top - 100
    }, 200);
}

/* 
    RENDER PRODUCTS
 */

function renderProducts(products) {

    let html = "";

    if (products.length === 0) {
        $("#productsWrapper").html(
            '<div class="col-12 text-center">No products found.</div>'
        );
        return;
    }

    products.forEach(p => {

        let stars = "";

        for (let i = 0; i < 5; i++) {
            stars += i < p.rating
                ? `<i class="fas fa-star"></i>`
                : `<i class="far fa-star"></i>`;
        }

        html += `

        <div class="col-md-6 col-lg-4 mb-4">

            <div class="shop-card">

                <div class="shop-card-img-wrapper">

                    ${p.isNew ? `<div class="badge-new">NEW IN</div>` : ""}

                    <img src="${p.image}" alt="${p.name}">

                </div>

                <div class="shop-card-body">

                    <h5 class="product-title">${p.name}</h5>

                    <p class="product-meta">${p.category.name} | ${p.brand}</p>

                    <div class="product-rating">${stars}</div>

                    <div class="product-price">$${p.price}</div>

                    <button class="btn-add-to-cart" onclick="addToCart(${p.id})">
                        ADD TO CART
                    </button>

                </div>

            </div>

        </div>

        `;
    });

    $("#productsWrapper").html(html);
}
/* 
    FILTERS & EVENTS
 */

function setupEventListeners() {
    $("#searchInput").on("input", function() {
        currentPage = 1;
        processProducts();
    });

    $("#sortSelect").on("change", function() {
        currentPage = 1;
        processProducts();
    });

    $(document).on("change", ".filter-type, .filter-brand", function() {
        currentPage = 1;
        processProducts();
    });
}

function filterProducts(products) {
    const search = $("#searchInput").val().toLowerCase();
    const selectedTypes = $(".filter-type:checked").map(function () { return this.value; }).get();
    const selectedBrands = $(".filter-brand:checked").map(function () { return this.value; }).get();

    return products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search);
        const matchType = selectedTypes.length === 0 || selectedTypes.includes(p.category.name);
        const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
        return matchSearch && matchType && matchBrand;
    });
}

function sortProducts(products) {
    const sort = $("#sortSelect").val();
    switch (sort) {
        case "priceAsc": return products.sort((a, b) => a.price - b.price);
        case "priceDesc": return products.sort((a, b) => b.price - a.price);
        case "nameAsc": return products.sort((a, b) => a.name.localeCompare(b.name));
        case "nameDesc": return products.sort((a, b) => b.name.localeCompare(a.name));
        default: return products;
    }
}

function renderFilterOptions(products) {
    const categories = [...new Set(products.map(p => p.category.name))];
    const brands = [...new Set(products.map(p => p.brand))];

    // Uzmi kategoriju iz URL-a
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('cat'); 

    let catHtml = categories.map(cat => {
        const id = cat.replace(/\s+/g, "_");
        
        const isChecked = (categoryFromUrl && cat.toLowerCase() === categoryFromUrl.toLowerCase()) 
                          ? "checked" 
                          : "";

        return `<div class="form-check">
                    <input class="form-check-input filter-type" type="checkbox" 
                           ${isChecked} value="${cat}" id="cat_${id}">
                    <label class="form-check-label" for="cat_${id}">${cat}</label>
                </div>`;
    }).join('');

    let brandHtml = brands.map(brand => {
        const id = brand.replace(/\s+/g, "_");
        return `<div class="form-check">
                    <input class="form-check-input filter-brand" type="checkbox" value="${brand}" id="brand_${id}">
                    <label class="form-check-label" for="brand_${id}">${brand}</label>
                </div>`;
    }).join('');

    $("#typeCheckboxes").html(catHtml);
    $("#brandCheckboxes").html(brandHtml);

    if (categoryFromUrl) {
        processProducts(); 
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
}

function renderSortOptions() {
    $("#sortSelect").html(`
        <option value="default">Default Sorting</option>
        <option value="priceAsc">Price Low to High</option>
        <option value="priceDesc">Price High to Low</option>
        <option value="nameAsc">Name A-Z</option>
        <option value="nameDesc">Name Z-A</option>
    `);
}



function updateCartBadge() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let total = cart.reduce((sum, i) => sum + i.quantity, 0);
    if (total > 0) {
        $("#cart-badge").text(total).show();
    } else {
        $("#cart-badge").hide();
    }
}
function addToCart(id) {
    const product = globalProducts.find(p => p.id == id);
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let existing = cart.find(i => i.id == id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();

    
    showToast("You have successfully added the product to the cart");
}

function changeQty(index, delta) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    if (cart[index]) {
        cart[index].quantity += delta;
        
       
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        
        localStorage.setItem("cart", JSON.stringify(cart));
        displayCart(); 
        updateCartBadge(); 
    }
}
function removeFromCart(index) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    cart.splice(index, 1);
    
    localStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
    updateCartBadge();
    
  
}
function processCheckout() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    if (cart.length === 0) {
        return; 
    }

    window.location.href = "checkout.html"; 
}



function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
}

function showCheckoutForm() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length > 0) {
        window.location.href = "checkout.html"; 
    }

    $("#cart-view").fadeOut(300, function() {
        $("#checkout-section").fadeIn(300);
        // Skroluj na vrh forme
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function backToCart() {
    $("#checkout-section").fadeOut(300, function() {
        $("#cart-view").fadeIn(300);
    });
}

function showToast(message, type = "dark") {
    const container = $("#toast-container");
    

    if (!container.length) return; 

    const bgClass = type === "success" ? "bg-success" : "bg-dark"; 

    const toast = $(`
        <div class="custom-toast ${bgClass} text-white px-4 py-3 rounded shadow">
            <span>${message}</span>
            <button class="toast-close text-white border-0 bg-transparent" style="font-size: 1.2rem; cursor: pointer;">
            &times;</button>
        </div>
    `);

    container.append(toast);
    
    setTimeout(() => {
        toast.fadeOut(400, function() { $(this).remove(); });
    }, 3000);

    toast.find(".toast-close").on("click", function() {
        toast.fadeOut(200, function() { $(this).remove(); });
    });
}
function backToCart() {
    window.location.href = "cart.html";
}
/* 
    BACK TO TOP
*/

$(window).on("scroll", function() {
    const btn = $("#backToTop");
    
    if ($(window).scrollTop() > 300) {
        btn.addClass("show");
    } else {
        btn.removeClass("show");
    }
});

$("#backToTop").on("click", function(e) {
    e.preventDefault();
    $("html, body").animate({ scrollTop: 0 }, 300);
});
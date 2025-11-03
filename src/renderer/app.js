const state = {
  products: [],
  customers: [],
  sales: [],
  saleCart: []
};

const menuButtons = document.querySelectorAll('.menu-item');
const views = {
  dashboard: document.querySelector('#view-dashboard'),
  products: document.querySelector('#view-products'),
  customers: document.querySelector('#view-customers'),
  sales: document.querySelector('#view-sales'),
  settings: document.querySelector('#view-settings')
};
const sectionTitle = document.querySelector('#section-title');
const toast = document.querySelector('#toast');
const statusPill = document.querySelector('#sync-status');

const metricTotalSales = document.querySelector('#metric-total-sales');
const metricAverageTicket = document.querySelector('#metric-average-ticket');
const metricStock = document.querySelector('#metric-stock');
const metricCustomers = document.querySelector('#metric-customers');
const cardStock = document.querySelector('#card-stock');

const tableRecentSales = document.querySelector('#table-recent-sales tbody');
const tableProducts = document.querySelector('#table-products tbody');
const tableCustomers = document.querySelector('#table-customers tbody');
const tableSales = document.querySelector('#table-sales tbody');

const formProduct = document.querySelector('#form-product');
const formCustomer = document.querySelector('#form-customer');
const formSale = document.querySelector('#form-sale');
const customerSearchInput = document.querySelector('#customer-search');
const stockBySizeList = document.querySelector('#stock-by-size-list');
const newSizeInput = document.querySelector('#new-size-input');
const addSizeBtn = document.querySelector('#add-size-btn');

const productInputs = {
  id: document.querySelector('#product-id'),
  name: document.querySelector('#product-name'),
  sku: document.querySelector('#product-sku'),
  price: document.querySelector('#product-price')
};

const customerInputs = {
  id: document.querySelector('#customer-id'),
  name: document.querySelector('#customer-name'),
  phone: document.querySelector('#customer-phone'),
  ci: document.querySelector('#customer-ci'),
  email: document.querySelector('#customer-email'),
  address: document.querySelector('#customer-address')
};

const saleInputs = {
  productSearch: document.querySelector('#sale-product-search'),
  productSku: document.querySelector('#sale-product-sku'),
  productId: document.querySelector('#sale-product'),
  customerSearch: document.querySelector('#sale-customer-search'),
  productSize: document.querySelector('#sale-product-size'),
  customerId: document.querySelector('#sale-customer'),
  quantity: document.querySelector('#sale-quantity'),
  paymentMethod: document.querySelector('#sale-payment'),
  notes: document.querySelector('#sale-notes')
};
const addToCartBtn = document.querySelector('#add-to-cart-btn');
const saleCartItems = document.querySelector('#sale-cart-items');
const saleTotalSummary = document.querySelector('#sale-total-summary');

function formatCurrency(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(number);
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.classList.remove('hidden', 'visible');
  toast.style.background = type === 'error' ? 'rgba(220, 38, 38, 0.92)' : 'rgba(15, 23, 42, 0.92)';
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3200);
}

function setView(target) {
  Object.entries(views).forEach(([key, element]) => {
    const isActive = key === target;
    element.classList.toggle('active', isActive);
  });
  menuButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === target);
  });
  const titles = {
    dashboard: 'Dashboard',
    products: 'Gestión de productos',
    customers: 'Gestión de clientes',
    sales: 'Registro de ventas',
    settings: 'Configuración'
  };
  sectionTitle.textContent = titles[target] || 'Dashboard';
}

menuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setView(button.dataset.target);
  });
});

cardStock.addEventListener('click', () => {
  window.api.openStockWindow(state.products);
});

addToCartBtn.addEventListener('click', handleAddToCart);
saleInputs.productId.addEventListener('change', updateSaleSizeOptions);
saleInputs.productSearch.addEventListener('input', filterProductSelect);
saleInputs.productSku.addEventListener('change', findProductBySku);
saleInputs.customerSearch.addEventListener('input', filterCustomerSelect);
customerSearchInput.addEventListener('input', renderCustomers);
saleCartItems.addEventListener('click', handleRemoveFromCart);

function updateStatus(message, type = 'ok') {
  statusPill.textContent = message;
  statusPill.style.background =
    type === 'error' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(34, 197, 94, 0.12)';
  statusPill.style.color = type === 'error' ? '#b91c1c' : '#16a34a';
}

async function refreshData(feedback = true) {
  updateStatus('Sincronizando...', 'info');
  const response = await window.api.loadData();
  if (!response.success) {
    updateStatus('Error al sincronizar', 'error');
    showToast(response.error || 'No se pudieron cargar los datos', 'error');
    return;
  }

  state.products = response.data.products || [];
  state.customers = response.data.customers || [];
  state.sales = response.data.sales || [];
  renderAll();
  updateStatus('Datos sincronizados');
  if (feedback) {
    showToast('Datos actualizados');
  }
}

function renderAll() {
  renderMetrics();
  renderProducts();
  renderCustomers();
  renderSales();
  populateSelects();
}

function renderMetrics() {
  const totalSales = state.sales.reduce((acc, sale) => acc + Number(sale.total || 0), 0);
  const averageTicket = state.sales.length ? totalSales / state.sales.length : 0;
  const totalStock = state.products.reduce((acc, product) => {
    const productStock = Object.values(product.stockBySize || {}).reduce((sum, stock) => sum + Number(stock), 0);
    return acc + productStock;
  }, 0);

  metricTotalSales.textContent = formatCurrency(totalSales);
  metricAverageTicket.textContent = formatCurrency(averageTicket);
  metricStock.textContent = totalStock;
  metricCustomers.textContent = state.customers.length;

  tableRecentSales.innerHTML = '';
  const recent = [...state.sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  if (!recent.length) {
    tableRecentSales.innerHTML = `<tr><td colspan="6">Sin ventas registradas aún.</td></tr>`;
    return;
  }

  recent.forEach((sale) => {
    const customer = state.customers.find((c) => c.id === sale.customerId);
    const row = document.createElement('tr');
    const productNames = sale.items.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      return `${product ? product.name : 'N/A'} (x${item.quantity})`;
    }).join(', ');
    const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    row.innerHTML = `
      <td>${formatDate(sale.date)}</td>
      <td>${productNames}</td>
      <td>${customer ? customer.name : 'Venta ocasional'}</td>
      <td>${totalQuantity}</td>
      <td>${formatCurrency(sale.total)}</td>
      <td>${sale.paymentMethod}</td>
    `;
    tableRecentSales.appendChild(row);
  });
}

function renderProducts() {
  tableProducts.innerHTML = '';
  if (!state.products.length) {
    tableProducts.innerHTML = `<tr><td colspan="6">Agrega tu primer producto para comenzar.</td></tr>`;
    return;
  }

  state.products.forEach((product) => {
    const totalStock = Object.values(product.stockBySize || {}).reduce((sum, stock) => sum + Number(stock), 0);
    const availableSizes = Object.keys(product.stockBySize || {}).filter(size => product.stockBySize[size] > 0).join(', ');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${availableSizes || 'Sin stock'}</td>
      <td>${formatCurrency(product.price)}</td>
      <td><span class="badge">${totalStock}</span></td>
      <td>
        <div class="table-actions">
          <button class="edit" data-action="edit" data-id="${product.id}">Editar</button>
          <button class="delete" data-action="delete" data-id="${product.id}">Eliminar</button>
        </div>
      </td>
    `;
    tableProducts.appendChild(row);
  });
}

function renderCustomers() {
  const searchTerm = customerSearchInput.value.toLowerCase();
  const filteredCustomers = state.customers.filter(customer => {
    const nameMatch = customer.name.toLowerCase().includes(searchTerm);
    const ciMatch = customer.ci && customer.ci.toLowerCase().includes(searchTerm);
    return nameMatch || ciMatch;
  });

  tableCustomers.innerHTML = '';
  if (filteredCustomers.length === 0) {
    tableCustomers.innerHTML = `<tr><td colspan="5">Registra clientes frecuentes para seguimiento.</td></tr>`;
    return;
  }

  filteredCustomers.forEach((customer) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${customer.name}</td>
      <td>${customer.ci || '-'}</td>
      <td>${customer.phone || '-'}</td>
      <td>${customer.email || '-'}</td>
      <td>${customer.address || '-'}</td>
      <td>
        <div class="table-actions">
          <button class="edit" data-action="edit" data-id="${customer.id}">Editar</button>
          <button class="delete" data-action="delete" data-id="${customer.id}">Eliminar</button>
        </div>
      </td>
    `;
    tableCustomers.appendChild(row);
  });
}

function renderSales() {
  tableSales.innerHTML = '';
  if (!state.sales.length) {
    tableSales.innerHTML = `<tr><td colspan="6">Aún no registras ventas.</td></tr>`;
    return;
  }

  const sorted = [...state.sales].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach((sale) => {
    const customer = state.customers.find((c) => c.id === sale.customerId);
    const productNames = sale.items.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      return `${product ? product.name : 'N/A'} (x${item.quantity})`;
    }).join(', ');
    const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const paymentInfo = sale.paymentReference ? `${sale.paymentMethod} (Ref: ${sale.paymentReference})` : sale.paymentMethod;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(sale.date)}</td>
      <td>${productNames}</td>
      <td>${customer ? customer.name : 'Venta ocasional'}</td>
      <td>${totalQuantity}</td>
      <td>${formatCurrency(sale.total)}</td>
      <td>${paymentInfo}</td>
    `;
    tableSales.appendChild(row);
  });
}

function populateSelects() {
  // Guardar valor seleccionado si existe
  const selectedProductId = saleInputs.productId.value;

  saleInputs.productId.innerHTML = '<option value="">-- Seleccione un producto --</option>';
  saleInputs.customerId.innerHTML = '<option value="">Venta ocasional</option>';

  state.products.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.name} (${formatCurrency(product.price)})`;
    saleInputs.productId.appendChild(option);
  });

  // Restaurar selección si aún es válida
  if (selectedProductId && state.products.some(p => p.id === selectedProductId)) {
    saleInputs.productId.value = selectedProductId;
  }

  // Limpiar y repoblar clientes
  state.customers.forEach((customer) => {
    const option = document.createElement('option');
    option.value = customer.id;
    option.textContent = `${customer.name} (${customer.ci})`;
    saleInputs.customerId.appendChild(option);
  });

  saleInputs.productId.disabled = state.products.length === 0;
  saleInputs.customerId.disabled = state.customers.length === 0;
  saleInputs.productSearch.disabled = state.products.length === 0;
  saleInputs.productSku.disabled = state.products.length === 0;
  saleInputs.customerSearch.disabled = state.customers.length === 0;
  updateSaleSizeOptions();
}

formProduct.addEventListener('submit', async (event) => {
  event.preventDefault();

  const stockBySize = {};
  const sizeInputs = stockBySizeList.querySelectorAll('.size-stock-item');
  sizeInputs.forEach(item => {
    const size = item.querySelector('.size-label').textContent;
    const stock = item.querySelector('input[type="number"]').value;
    if (size && stock) {
      stockBySize[size] = Number(stock);
    }
  });

  const payload = {
    id: productInputs.id.value || undefined,
    name: productInputs.name.value.trim(),
    sku: productInputs.sku.value.trim(),
    price: Number(productInputs.price.value),
    stockBySize
  };

  const response = await window.api.saveProduct(payload);
  if (!response.success) {
    showToast(response.error || 'No se pudo guardar el producto', 'error');
    return;
  }

  formProduct.reset();
  productInputs.id.value = '';
  renderStockBySizeEditor({});
  await refreshData(false);
  showToast('Producto guardado correctamente');
});

formProduct.addEventListener('reset', () => {
  setTimeout(() => {
    productInputs.id.value = '';
    renderStockBySizeEditor({});
  }, 0);
});

tableProducts.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { action, id } = button.dataset;
  if (!action || !id) return;

  if (action === 'edit') {
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    productInputs.id.value = product.id;
    productInputs.name.value = product.name;
    productInputs.sku.value = product.sku || '';
    productInputs.price.value = product.price;
    renderStockBySizeEditor(product.stockBySize || {});
    showToast('Editando producto seleccionado');
  }

  if (action === 'delete') {
    if (!confirm('¿Eliminar este producto?')) return;
    const response = await window.api.deleteProduct(id);
    if (!response.success) {
      showToast(response.error || 'No se pudo eliminar el producto', 'error');
      return;
    }
    await refreshData(false);
    showToast('Producto eliminado');
  }
});

formCustomer.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = customerInputs.name.value.trim();
  let ci = customerInputs.ci.value.trim();

  // Validación de campos
  if (!name) {
    showToast('El nombre y apellido son obligatorios.', 'error');
    return;
  }

  if (!ci) {
    showToast('La cédula de identidad es obligatoria.', 'error');
    return;
  }

  // Validación y formato de Cédula de Identidad
  if (/^\d+$/.test(ci)) { // Si son solo números, se le añade 'V-'
    ci = `V-${ci}`;
  } else if (!/^V-\d+$/.test(ci)) {
    showToast('Formato de cédula inválido. Use V-XXXXXXXX o solo números.', 'error');
    return;
  }

  const payload = {
    id: customerInputs.id.value || undefined,
    name: name,
    phone: customerInputs.phone.value.trim(),
    ci: ci,
    email: customerInputs.email.value.trim(),
    address: customerInputs.address.value.trim()
  };

  const response = await window.api.saveCustomer(payload);
  if (!response.success) {
    showToast(response.error || 'No se pudo guardar el cliente', 'error');
    return;
  }

  formCustomer.reset();
  customerInputs.id.value = '';
  await refreshData(false);
  showToast('Cliente guardado');
});

formCustomer.addEventListener('reset', () => {
  setTimeout(() => {
    customerInputs.id.value = '';
  }, 0);
});

tableCustomers.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { action, id } = button.dataset;
  if (!action || !id) return;

  if (action === 'edit') {
    const customer = state.customers.find((item) => item.id === id);
    if (!customer) return;
    customerInputs.id.value = customer.id;
    customerInputs.name.value = customer.name;
    customerInputs.phone.value = customer.phone || '';
    customerInputs.ci.value = customer.ci || '';
    customerInputs.email.value = customer.email || '';
    customerInputs.address.value = customer.address || '';
    showToast('Editando cliente seleccionado');
  }

  if (action === 'delete') {
    if (!confirm('¿Eliminar este cliente?')) return;
    const response = await window.api.deleteCustomer(id);
    if (!response.success) {
      showToast(response.error || 'No se pudo eliminar el cliente', 'error');
      return;
    }
    await refreshData(false);
    showToast('Cliente eliminado');
  }
});

formSale.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.saleCart.length === 0) {
    showToast('El carrito de venta está vacío', 'error');
    return;
  }

  let paymentReference = null;
  if (saleInputs.paymentMethod.value === 'Pago Móvil') {
    paymentReference = await window.api.getPaymentReference();
    if (!paymentReference) {
      showToast('Registro de venta cancelado.', 'info');
      return;
    }
  }

  const payload = {
    items: state.saleCart,
    customerId: saleInputs.customerId.value || null,
    paymentMethod: saleInputs.paymentMethod.value,
    notes: saleInputs.notes.value.trim(),
    paymentReference
  };

  const response = await window.api.recordSale(payload);
  if (!response.success) {
    showToast(response.error || 'No se pudo registrar la venta', 'error');
    return;
  }

  formSale.reset();
  state.saleCart = [];
  renderSaleCart();
  await refreshData(false);
  showToast('Venta registrada con éxito');
});

formSale.addEventListener('reset', () => {
  setTimeout(() => {
    state.saleCart = [];
    renderSaleCart();
  }, 0);
});

// --- Lógica para Stock por Talla ---
addSizeBtn.addEventListener('click', () => {
  const newSize = newSizeInput.value.trim();
  if (newSize) {
    const existingSizes = Array.from(stockBySizeList.querySelectorAll('.size-label')).map(el => el.textContent);
    if (!existingSizes.includes(newSize)) {
      addSizeStockInput(newSize, 0);
      newSizeInput.value = '';
      newSizeInput.focus();
    } else {
      showToast('Esa talla ya ha sido agregada.', 'error');
    }
  }
});

stockBySizeList.addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-size-btn')) {
    event.target.closest('.size-stock-item').remove();
  }
});

function addSizeStockInput(size, stock) {
  const item = document.createElement('div');
  item.classList.add('size-stock-item');
  item.innerHTML = `
    <span class="size-label">${size}</span>
    <input type="number" value="${stock}" min="0" step="1" required />
    <button type="button" class="remove-size-btn">&times;</button>
  `;
  stockBySizeList.appendChild(item);
}

function renderStockBySizeEditor(stockData) {
  stockBySizeList.innerHTML = '';
  for (const size in stockData) {
    addSizeStockInput(size, stockData[size]);
  }
}

// --- Lógica para Carrito de Ventas ---
function filterCustomerSelect() {
  const searchTerm = saleInputs.customerSearch.value.toLowerCase();
  const options = saleInputs.customerId.options;
  const visibleCustomers = [];

  for (let i = 1; i < options.length; i++) { // Empezar en 1 para omitir "Venta ocasional"
    const option = options[i];
    const customerText = option.textContent.toLowerCase();
    const isVisible = customerText.includes(searchTerm);
    option.style.display = isVisible ? '' : 'none';
    if (isVisible) {
      visibleCustomers.push(option);
    }
  }

  // Si el cliente seleccionado actualmente está oculto, resetea la selección
  if (saleInputs.customerId.options[saleInputs.customerId.selectedIndex]?.style.display === 'none') {
    saleInputs.customerId.value = '';
  }

  // Si solo hay un cliente visible como resultado de la búsqueda, seleccionarlo automáticamente.
  if (visibleCustomers.length === 1) {
    saleInputs.customerId.value = visibleCustomers[0].value;
  }
}

function filterProductSelect() {
  const searchTerm = saleInputs.productSearch.value.toLowerCase();
  const options = saleInputs.productId.options;

  for (let i = 1; i < options.length; i++) { // Empezar en 1 para omitir "-- Seleccione..."
    const option = options[i];
    const productName = option.textContent.toLowerCase();
    const isVisible = productName.includes(searchTerm);
    option.style.display = isVisible ? '' : 'none';
  }
  // Si el producto seleccionado actualmente está oculto, resetea la selección
  if (saleInputs.productId.options[saleInputs.productId.selectedIndex]?.style.display === 'none') {
    saleInputs.productId.value = '';
    updateSaleSizeOptions();
  }
}

function findProductBySku() {
  const sku = saleInputs.productSku.value.trim();
  if (!sku) return;

  const product = state.products.find(p => p.sku && p.sku.toLowerCase() === sku.toLowerCase());

  if (product) {
    saleInputs.productId.value = product.id;
    saleInputs.productSku.value = product.sku; // Mostrar el SKU encontrado
    updateSaleSizeOptions(); // Actualiza las tallas para el producto encontrado
    showToast(`Producto "${product.name}" seleccionado.`);
    saleInputs.productSearch.value = ''; // Limpiar también el filtro de nombre
    setTimeout(() => { saleInputs.productSku.value = ''; }, 1500); // Limpiar campo después de un momento
    filterProductSelect(); // Resetear el filtro visual del select
  } else {
    showToast('No se encontró ningún producto con ese código.', 'error');
  }
}

function updateSaleSizeOptions() {
  const productId = saleInputs.productId.value;
  saleInputs.productSize.innerHTML = '';
  if (!productId) return;

  const product = state.products.find(p => p.id === productId);
  if (product && product.stockBySize) {
    const availableSizes = Object.keys(product.stockBySize).filter(size => product.stockBySize[size] > 0);
    if (availableSizes.length > 0) {
      availableSizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = `${size} (Stock: ${product.stockBySize[size]})`;
        saleInputs.productSize.appendChild(option);
      });
    } else {
      saleInputs.productSize.innerHTML = '<option value="">Sin stock</option>';
    }
  }
}

function handleAddToCart() {
  const productId = saleInputs.productId.value;
  const size = saleInputs.productSize.value;
  const quantity = Number(saleInputs.quantity.value);
  const product = state.products.find(p => p.id === productId);

  if (!product || !size || quantity <= 0) {
    showToast('Por favor, selecciona un producto, talla y cantidad válidos.', 'error');
    return;
  }

  if ((product.stockBySize[size] || 0) < quantity) {
    showToast('Stock insuficiente para la talla seleccionada.', 'error');
    return;
  }

  const existingItem = state.saleCart.find(item => item.productId === productId && item.size === size);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.saleCart.push({ productId, name: product.name, size, quantity, price: product.price });
  }

  renderSaleCart();
}

function handleRemoveFromCart(event) {
  if (event.target.classList.contains('remove-cart-item-btn')) {
    const index = Number(event.target.dataset.index);
    state.saleCart.splice(index, 1);
    renderSaleCart();
  }
}

function renderSaleCart() {
  saleCartItems.innerHTML = '';
  let total = 0;
  if (state.saleCart.length === 0) {
    saleCartItems.innerHTML = '<li class="cart-empty">El carrito está vacío</li>';
  } else {
    state.saleCart.forEach((item, index) => {
      const li = document.createElement('li');
      li.classList.add('cart-item');
      li.innerHTML = `
        <div class="cart-item-details">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-meta">Talla: ${item.size} | Cant: ${item.quantity}</span>
        </div>
        <div class="cart-item-actions">
          <span>${formatCurrency(item.price * item.quantity)}</span>
          <button type="button" class="remove-cart-item-btn" data-index="${index}">&times;</button>
        </div>
      `;
      saleCartItems.appendChild(li);
      total += item.price * item.quantity;
    });
  }
  saleTotalSummary.textContent = formatCurrency(total);
}

// --- Lógica para Configuración (Backup, Import, Reset) ---
const btnBackup = document.querySelector('#btn-backup');
const btnImport = document.querySelector('#btn-import');
const btnReset = document.querySelector('#btn-reset');

btnBackup.addEventListener('click', async () => {
  const response = await window.api.backupData();
  if (response.success) {
    showToast('Respaldo creado exitosamente.');
  } else if (response.error) {
    showToast(response.error, 'error');
  }
  // Si se cancela, no se muestra nada.
});

btnImport.addEventListener('click', async () => {
  if (!confirm('¿Estás seguro de que quieres importar un respaldo? Todos los datos actuales se perderán.')) {
    return;
  }
  const response = await window.api.importData();
  if (response.success) {
    await refreshData(false);
    showToast('Datos importados correctamente.');
  } else if (response.error) {
    showToast(response.error, 'error');
  }
});

btnReset.addEventListener('click', async () => {
  if (!confirm('¡ADVERTENCIA! ¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.')) {
    return;
  }
  await window.api.resetData();
  await refreshData(false);
  showToast('Todos los datos han sido borrados.');
});

refreshData();

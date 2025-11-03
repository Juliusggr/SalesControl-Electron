const tableStockDetail = document.querySelector('#table-stock-detail tbody');

function renderStockDetail(products) {
  tableStockDetail.innerHTML = '';

  if (!products || products.length === 0) {
    tableStockDetail.innerHTML = `<tr><td colspan="3" class="text-center">No hay productos en el inventario.</td></tr>`;
    return;
  }

  products.forEach((product) => {
    const stockData = product.stockBySize || {};
    const totalStock = Object.values(stockData).reduce((sum, stock) => sum + Number(stock), 0);

    // Crear el string de desglose de tallas, ej: "S: 5, M: 10, L: 4"
    const sizeBreakdown = Object.entries(stockData)
      .map(([size, stock]) => `<strong>${size}:</strong> ${stock}`)
      .join(' | ');

    const row = document.createElement('tr');

    // Si no hay stock, mostrar un mensaje diferente
    if (totalStock === 0) {
      row.innerHTML = `
        <td>${product.name}</td>
        <td class="text-center"><span class="badge badge-danger">0</span></td>
        <td>Sin stock registrado</td>
      `;
    } else {
      row.innerHTML = `
        <td>${product.name}</td>
        <td class="text-center"><span class="badge">${totalStock}</span></td>
        <td>${sizeBreakdown || 'N/A'}</td>
      `;
    }
    tableStockDetail.appendChild(row);
  });
}

window.api.on('stock:data', (event, products) => {
  renderStockDetail(products);
});
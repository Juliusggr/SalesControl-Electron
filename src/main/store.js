const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const DEFAULT_DATA = {
  products: [],
  customers: [],
  sales: []
};

class Store {
  constructor(filename = 'sales-db.json') {
    this.filePath = path.join(app.getPath('userData'), filename);
    this.data = { ...DEFAULT_DATA };
    this._ensureDirectory();
    this._load();
  }

  _ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULT_DATA, ...parsed };
      } else {
        this._persist();
      }
    } catch (error) {
      console.error('Failed to load store, resetting to defaults.', error);
      this.data = { ...DEFAULT_DATA };
      this._persist();
    }
  }

  _persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  _updateAndPersist(updateFn) {
    const result = updateFn(this.data);
    this._persist();
    return result;
  }

  getData() {
    return this.data;
  }

  upsertProduct(product) {
    const { id, name, price, stockBySize } = product;
    if (!name || !price) {
      throw new Error('Nombre y precio son requeridos');
    }

    if (price < 0) {
      throw new Error('Valores negativos no son permitidos');
    }

    const existing = this.data.products.find((p) => p.id === id);

    if (existing) {
      const idx = this.data.products.findIndex((p) => p.id === id);
      this.data.products[idx] = { ...existing, ...product };
    } else {
      const newProduct = {
        id: nanoid(),
        name,
        price,
        stockBySize: stockBySize || {},
        sku: product.sku || ''
      };
      this.data.products.push(newProduct);
    }

    this.save();
    return product;
  }

  deleteProduct(id) {
    this.data.products = this.data.products.filter((p) => p.id !== id);
    this.save();
  }

  upsertCustomer(customer) {
    const { id, name, phone, email, ci, address } = customer;
    if (!name) {
      throw new Error('El nombre del cliente es requerido');
    }

    const existing = this.data.customers.find((c) => c.id === id);

    if (existing) {
      const idx = this.data.customers.findIndex((c) => c.id === id);
      this.data.customers[idx] = { ...existing, ...customer };
    } else {
      const newCustomer = { id: nanoid(), name, phone, email, ci, address };
      this.data.customers.push(newCustomer);
    }

    this.save();
    return customer;
  }

  deleteCustomer(id) {
    this.data.customers = this.data.customers.filter((c) => c.id !== id);
    this.save();
  }

  recordSale(sale) {
    const { items, customerId, paymentMethod, notes, paymentReference } = sale;
    if (!items || items.length === 0) {
      throw new Error('La venta debe tener al menos un producto.');
    }

    let totalSaleAmount = 0;

    // Validar stock y calcular total
    for (const item of items) {
      const product = this.data.products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Producto ${item.name} no encontrado.`);
      if (!product.stockBySize[item.size] || product.stockBySize[item.size] < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name} (Talla: ${item.size}). Stock actual: ${product.stockBySize[item.size] || 0}`);
      }
      totalSaleAmount += product.price * item.quantity;
    }

    // Descontar stock
    for (const item of items) {
      const product = this.data.products.find((p) => p.id === item.productId);
      product.stockBySize[item.size] -= item.quantity;
    }

    const newSale = {
      id: nanoid(),
      ...sale,
      date: new Date().toISOString()
    };
    newSale.total = totalSaleAmount;

    this.data.sales.push(newSale);
    this.save();
    return newSale;
  }

  resetData() {
    this.data = { ...DEFAULT_DATA };
    this.save();
    return true;
  }

  importData(data) {
    // Validar que la data importada tenga la estructura esperada
    if (data && 'products' in data && 'customers' in data && 'sales' in data) {
      this.data = { ...DEFAULT_DATA, ...data };
      this.save();
      return true;
    }
    throw new Error('El archivo de respaldo no tiene el formato correcto.');
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error al guardar los datos:', error);
    }
  }
}

module.exports = { Store };

/*
        this._persist();
      }
    } catch (error) {
      console.error('Failed to load store, resetting to defaults.', error);
      this.data = { ...DEFAULT_DATA };
      this._persist();
    }
*/

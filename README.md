# Control de Ventas para Tienda de Ropa

Aplicación de escritorio creada con [Electron](https://www.electronjs.org/) y tecnologías web modernas para administrar el inventario, los clientes y el registro de ventas de una boutique o tienda de ropa.

## ✨ Características principales

- 📊 **Dashboard** con métricas clave (ventas totales, ticket promedio, stock disponible, clientes activos) y listado de ventas recientes.
- 🛍️ **Gestión de productos** con soporte para SKU, categoría, tallas, color, precio y stock.
- 🙋 **Directorio de clientes** con datos de contacto y notas.
- 💳 **Registro de ventas** con cálculo automático de totales, manejo de stock y métodos de pago.
- 💾 **Persistencia local** utilizando un archivo JSON almacenado en la carpeta de datos del usuario.
- 🔐 **Context Isolation** habilitado para mantener segura la comunicación entre procesos en Electron.

## 🚀 Puesta en marcha

1. Instala las dependencias (solo la primera vez):

   ```powershell
   cd "c:\Users\Juliusggr\Documents\electron test"
   npm.cmd install
   ```

2. Ejecuta la aplicación en modo escritorio:

   ```powershell
   npm.cmd run start
   ```

   > Si PowerShell bloquea el comando `npm`, usa `npm.cmd` como en los ejemplos anteriores.

## 📁 Estructura del proyecto

```
.
├── package.json
├── README.md
├── scripts
│   └── run-tests.js
├── src
│   ├── main
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── store.js
│   └── renderer
│       ├── app.js
│       ├── index.html
│       └── styles.css
└── data
```

- `src/main/*`: Código del proceso principal de Electron y la capa de persistencia.
- `src/renderer/*`: Interfaz de usuario construida con HTML, CSS y JavaScript.
- `scripts/run-tests.js`: Marcador para comandos de prueba (actualmente solo imprime un recordatorio).

## 🧪 Pruebas

Por ahora no hay pruebas automatizadas. El script `npm run test` imprime un mensaje recordándote que ejecutes la app manualmente para validar los flujos.

## 📦 Empaquetado

No se incluye todavía un proceso de empaquetado. Puedes explorar herramientas como [`electron-builder`](https://www.electron.build/) para generar instaladores según tu sistema operativo.

## 📝 Licencia

[MIT](./LICENSE) © 2025 Juliusggr

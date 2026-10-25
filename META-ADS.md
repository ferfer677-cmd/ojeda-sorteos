# Seguimiento de Meta Ads: ojedasorteos.com.ar

Guía para quien maneja los anuncios. No se publica en la web.

## Qué está armado

| Momento | Quién avisa a Meta | Evento |
|---|---|---|
| Toca un pack | Píxel (navegador) | `InitiateCheckout` con el precio del pack |
| Envía el comprobante | Píxel (navegador) | `Purchase` con el monto, `eventID` = `metaEventId` |
| El admin aprueba el pago | Servidor (API de Conversiones) | `Purchase` con el monto real y el **mismo** `event_id` |

- **Píxel:** `1685745569217221`
- **Deduplicación:** el navegador y el servidor mandan el mismo ID de evento (`metaEventId`, guardado en la compra), así Meta cuenta una sola compra.
- **Datos que manda el servidor:** teléfono (549…), nombre, apellido, país `ar` y DNI como `external_id`, todo cifrado con SHA-256. Además `fbc`, `fbp` y el user agent que se guardaron al enviar el comprobante.
- **Cuándo se dispara:** cuando una compra pasa a "Pagado" en Firestore. Cubre "Aprobar pago" y "Aprobar todos". Se manda una sola vez por compra.
- En el admin, cada compra aprobada muestra **📡 Meta ✓** si Meta la recibió, o **📡 Meta ✗** si hubo un error (pasando el mouse se ve el motivo).
- Código del servidor: `functions/index.js` (Cloud Function `compraAprobadaAMeta`, región `southamerica-east1`).

## Para activarlo (una sola vez)

### 1. Generar el token
Administrador de eventos → el Píxel → **Configuración** → **API de Conversiones** → **Generar token de acceso**. Copiarlo.

### 2. Guardarlo como secreto de Firebase
En una terminal, dentro de la carpeta del proyecto y con sesión iniciada en Firebase (`firebase login`):

```
firebase functions:secrets:set META_CAPI_TOKEN
```

Te pide el valor: pegás el token y Enter. **No se guarda en ningún archivo ni en el repo**, ni se manda por chat o documentos.

### 3. Publicar la función

```
firebase deploy --only functions
```

La primera vez Firebase puede pedir habilitar algunas APIs de Google Cloud (Cloud Functions, Cloud Build, Artifact Registry, Secret Manager): aceptar. El proyecto ya tiene facturación activa. El costo con este volumen es de centavos o nulo.

## Probar antes de lanzar

1. Administrador de eventos → **Probar eventos** → copiar el código (ej. `TEST12345`).
2. Firebase → Firestore → crear la colección **`privado`**, documento **`meta`**, campo **`testEventCode`** (texto) = ese código.
3. Hacer una compra de prueba en la web (1 chance, comprobante propio) y aprobarla en el admin.
4. En "Probar eventos" tienen que aparecer:
   - `Purchase` del **navegador** (al enviar el comprobante)
   - `Purchase` del **servidor** (al aprobar), marcado como **deduplicado**
5. En el admin la compra muestra **📡 Meta ✓ (prueba)**.
6. **Borrar el documento `privado/meta`** (si no, los eventos reales siguen yendo como prueba) y borrar la compra de prueba desde el admin.

## Campaña

- Objetivo **Ventas** → evento de conversión **Compra** (Píxel `1685745569217221`).
- Público: similar 1% de **"Compradores Ojeda"** (lista de clientes con valor), y/o Advantage+.
- Palabras clave por portal: `50` y `MENOS` (50% OFF). Cada compra guarda cuál usó (en el Píxel va como `content_category`).
- URL: `https://ojedasorteos.com.ar/`
- Cierre de compras: **viernes 13/11/2026, 19:00**. Sorteo en vivo: 21:00.

## Si algo falla

- **📡 Meta ✗ en el admin:** pasar el mouse para ver el error. Los más comunes son token vencido o mal copiado (repetir el paso 2 y volver a publicar).
- **Logs del servidor:** Firebase → Functions → `compraAprobadaAMeta` → Registros.
- Una compra con error no se reintenta sola. El pago queda aprobado igual; solo esa compra no llega a Meta por el servidor (sí llegó por el Píxel, si el navegador no lo bloqueó).

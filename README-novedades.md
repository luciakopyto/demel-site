# Cómo conectar Novedades con Google Forms

## 1. Crear el formulario

En [forms.google.com](https://forms.google.com) creá un formulario nuevo (por ejemplo "DEMEL — Cargar novedad") con estas preguntas, **en este orden y con estos nombres** (o similares — el sitio detecta la columna por palabra clave, no por posición exacta):

| # | Pregunta          | Tipo               | Obligatoria |
|---|--------------------|---------------------|:-----------:|
| 1 | Título             | Respuesta corta     | Sí |
| 2 | Fecha              | Fecha               | Sí |
| 3 | Texto              | Párrafo             | Sí |
| 4 | Link (opcional)    | Respuesta corta     | No |
| 5 | Imagen (URL) (opcional) | Respuesta corta | No |

- **Link**: para linkear a una nota, un PDF, la AFIP, etc. Si se deja vacío, la novedad simplemente no muestra el botón "Leer más".
- **Imagen (URL)**: pegar acá la URL pública de una imagen (por ejemplo, subida a Google Drive con acceso "cualquiera con el link" y usando el link de descarga directa, o subida a cualquier hosting de imágenes). Si se deja vacío, la novedad se muestra sin imagen.

## 2. Vincular una planilla de respuestas

Dentro del formulario, pestaña **Respuestas** → ícono verde de Sheets → **Crear planilla nueva**. Se abre un Google Sheet vinculado que se completa solo con cada respuesta.

## 3. Publicar esa planilla como CSV

En el Google Sheet:

1. **Archivo → Compartir → Publicar en la Web**.
2. En el primer desplegable, elegí la hoja específica de respuestas (normalmente **"Respuestas de formulario 1"**), no "Todo el documento".
3. En el segundo desplegable, elegí **Valores separados por comas (.csv)**.
4. Click en **Publicar** y confirmá.
5. Copiá el link que te da. Va a tener esta forma:

   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vT.../pub?output=csv
   ```

## 4. Pegar el link en el sitio

Abrí [js/novedades.js](js/novedades.js) y en la primera línea con contenido pegá esa URL:

```js
var CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT.../pub?output=csv";
```

Guardá, subí los cambios al hosting, y listo: cada vez que completes el formulario, la novedad va a aparecer en el sitio automáticamente (recargando la página) — no hace falta tocar código ni volver a publicar el sitio.

## Notas

- Las novedades se ordenan automáticamente de más nueva a más vieja según el campo **Fecha**.
- Si borrás o editás una fila directamente en el Sheet, el cambio también se refleja en el sitio.
- La planilla publicada es de **solo lectura pública** (cualquiera con el link puede ver el CSV), pero seguís siendo vos quien controla qué se carga, a través del formulario o editando la hoja.
- Si en algún momento querés dar de baja la sección sin borrar nada, alcanza con dejar `CSV_URL = ""` — el sitio muestra "Próximamente" automáticamente.

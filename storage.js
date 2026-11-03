import { storage } from "./firebase.js";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

import { registrarErrorCompra } from "./errores-compra.js";

// =====================================================
// LÍMITES
// =====================================================

// Si la subida no avanza en este tiempo, se cancela
// y se le avisa al comprador para que reintente.
const SEGUNDOS_SIN_AVANCE = 45;

// Las fotos se achican a este tamaño antes de subir
const LADO_MAXIMO = 1600;


// =====================================================
// ACHICAR FOTO
// =====================================================
// Una foto del celular pesa 3-8 MB; achicada queda en ~300 KB
// y sube rápido aunque la conexión sea mala.
// Si no se puede (PDF, HEIC en algunos navegadores, etc.)
// se sube el archivo original.

async function achicarImagen(file) {

  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.size < 400 * 1024
  ) {
    return file;
  }

  try {

    const imagen =
      await createImageBitmap(
        file,
        { imageOrientation: "from-image" }
      );

    const escala =
      Math.min(
        1,
        LADO_MAXIMO / Math.max(imagen.width, imagen.height)
      );

    const canvas =
      document.createElement("canvas");

    canvas.width =
      Math.round(imagen.width * escala);

    canvas.height =
      Math.round(imagen.height * escala);

    canvas
      .getContext("2d")
      .drawImage(imagen, 0, 0, canvas.width, canvas.height);

    imagen.close?.();

    const blob =
      await new Promise(
        (resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.82)
      );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const nombre =
      file.name.replace(/\.[^.]*$/, "") + ".jpg";

    return new File(
      [blob],
      nombre,
      { type: "image/jpeg" }
    );

  } catch (error) {

    console.warn(
      "No se pudo achicar la imagen, se sube la original:",
      error
    );

    return file;

  }

}


// =====================================================
// SUBIR COMPROBANTE
// =====================================================

// El link se pide después de subir: si falla se reintenta, y si sigue
// fallando la compra se guarda igual (el admin lo arma con la ruta).

async function pedirLink(referencia, archivo) {

  for (let intento = 1; intento <= 3; intento++) {

    try {

      return await getDownloadURL(referencia);

    } catch (error) {

      if (intento === 3) {
        registrarErrorCompra({ etapa: "link", error, archivo });
        return "";
      }

      await new Promise(
        (resolve) => setTimeout(resolve, intento * 1500)
      );

    }

  }

}


export async function subirComprobante(file, onProgress) {

  const archivo =
    await achicarImagen(file);

  try {

    return await subirUnaVez(archivo, onProgress);

  } catch (error) {

    // Sin señal o archivo rechazado: reintentar no sirve
    if (
      error.message === "SIN_CONEXION" ||
      error.code === "storage/unauthorized"
    ) {
      throw error;
    }

    registrarErrorCompra({ etapa: "reintento", error, archivo });

    return subirUnaVez(archivo, onProgress);

  }

}


function subirUnaVez(archivo, onProgress) {

  const nombreArchivo =
    Date.now() + "_" +
    archivo.name.replace(/[^\w.\-]/g, "_");

  const rutaArchivo =
    "comprobantes/" + nombreArchivo;

  const storageRef = ref(
    storage,
    rutaArchivo
  );

  return new Promise((resolve, reject) => {

    const uploadTask =
      uploadBytesResumable(
        storageRef,
        archivo,
        { contentType: archivo.type || "application/octet-stream" }
      );

    // Cancelar si pasa mucho tiempo sin avanzar
    // (señal cortada, wifi que se cae, etc.)

    let vigilancia = null;

    function reiniciarVigilancia() {

      clearTimeout(vigilancia);

      vigilancia =
        setTimeout(
          () => {
            uploadTask.cancel();
            reject(new Error("SIN_CONEXION"));
          },
          SEGUNDOS_SIN_AVANCE * 1000
        );

    }

    reiniciarVigilancia();

    uploadTask.on(
      "state_changed",

      (snapshot) => {

        reiniciarVigilancia();

        const progreso = Math.round(
          (snapshot.bytesTransferred /
            snapshot.totalBytes) * 100
        );

        if (onProgress) {
          onProgress(progreso);
        }

      },

      (error) => {
        clearTimeout(vigilancia);
        reject(error);
      },

      async () => {

        clearTimeout(vigilancia);

        resolve({
          url: await pedirLink(uploadTask.snapshot.ref, archivo),
          path: rutaArchivo
        });

      }
    );

  });
}

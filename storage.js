import { storage } from "./firebase.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

export async function subirComprobante(file) {

  const nombreArchivo =
    Date.now() + "_" + file.name;

  const rutaArchivo =
    "comprobantes/" + nombreArchivo;

  const storageRef = ref(
    storage,
    rutaArchivo
  );

  await uploadBytes(storageRef, file);

  const url = await getDownloadURL(storageRef);

  return {
    url,
    path: rutaArchivo
  };
}
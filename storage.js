import { storage } from "./firebase.js";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

export async function subirComprobante(file, onProgress) {

  const nombreArchivo =
    Date.now() + "_" + file.name;

  const rutaArchivo =
    "comprobantes/" + nombreArchivo;

  const storageRef = ref(
    storage,
    rutaArchivo
  );
return new Promise((resolve, reject) => {

  const uploadTask =
    uploadBytesResumable(storageRef, file);

  uploadTask.on(
    "state_changed",

    (snapshot) => {

      const progreso = Math.round(
        (snapshot.bytesTransferred /
          snapshot.totalBytes) * 100
      );

      if (onProgress) {
  onProgress(progreso);
}

    },

    (error) => {
      reject(error);
    },

    async () => {

      const url =
        await getDownloadURL(
          uploadTask.snapshot.ref
        );

      resolve({
        url,
        path: rutaArchivo
      });

    }
  );

});
}
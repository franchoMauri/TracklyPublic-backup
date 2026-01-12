import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { app } from "./firebase";

const storage = getStorage(app);

export const uploadProfilePhoto = async (uid, file) => {
  const fileRef = ref(storage, `profile-photos/${uid}`);

  const task = uploadBytesResumable(fileRef, file);

  await new Promise((resolve, reject) => {
    task.on("state_changed", null, reject, resolve);
  });

  return await getDownloadURL(fileRef);
};

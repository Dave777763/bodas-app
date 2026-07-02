import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Compresses an image file/blob to optimize size before uploading or storing.
 */
export async function compressImage(
    fileOrBlob: File | Blob,
    maxWidth = 1000,
    quality = 0.78
): Promise<{ blob: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
        // If running on server, return error
        if (typeof window === "undefined") {
            reject(new Error("Window not defined"));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", quality);

                // Convert DataURL to Blob
                const arr = dataUrl.split(",");
                const mimeMatch = arr[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime });
                resolve({ blob, dataUrl });
            };
            img.onerror = (e) => reject(e);
            img.src = event.target?.result as string;
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrBlob);
    });
}

/**
 * Uploads an image to Firebase Storage. If Firebase Storage fails (e.g. Quota Exceeded Error 402),
 * automatically falls back to anonymous Imgur upload, or directly returns the optimized base64 DataURL.
 */
export async function uploadEventImage(
    storagePath: string,
    fileOrBlob: File | Blob,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (onProgress) onProgress(10);

    let compressedBlob: Blob = fileOrBlob;
    let fallbackDataUrl = "";

    // 1. Try to compress/optimize image
    try {
        const optimized = await compressImage(fileOrBlob, 1000, 0.78);
        compressedBlob = optimized.blob;
        fallbackDataUrl = optimized.dataUrl;
        if (onProgress) onProgress(30);
    } catch (e) {
        console.warn("Could not compress image, proceeding with original file:", e);
        try {
            fallbackDataUrl = await new Promise<string>((resolve) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.readAsDataURL(fileOrBlob);
            });
        } catch (_) {}
    }

    // 2. Try Firebase Storage first
    try {
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, compressedBlob);
        if (onProgress) onProgress(80);
        const downloadUrl = await getDownloadURL(storageRef);
        if (onProgress) onProgress(100);
        return downloadUrl;
    } catch (firebaseError: any) {
        console.warn(
            "Firebase Storage upload failed (e.g. Error 402 Quota Exceeded). Attempting fallback storage...",
            firebaseError?.message || firebaseError
        );
    }

    // 3. Fallback 1: Try anonymous Imgur upload
    if (fallbackDataUrl) {
        try {
            if (onProgress) onProgress(50);
            const base64Data = fallbackDataUrl.split(",")[1];
            if (base64Data) {
                const response = await fetch("https://api.imgur.com/3/image", {
                    method: "POST",
                    headers: {
                        Authorization: "Client-ID 546c25a59c58ad7",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        image: base64Data,
                        type: "base64",
                    }),
                });
                const result = await response.json();
                if (result?.success && result?.data?.link) {
                    if (onProgress) onProgress(100);
                    return result.data.link;
                }
            }
        } catch (imgurError) {
            console.warn("Imgur fallback failed, using optimized base64 fallback directly:", imgurError);
        }
    }

    // 4. Fallback 2: Return lightweight DataURL directly (stores safely in Firestore)
    if (onProgress) onProgress(100);
    if (fallbackDataUrl) {
        return fallbackDataUrl;
    }

    throw new Error("No fue posible guardar la imagen. Revisa tu conexión.");
}

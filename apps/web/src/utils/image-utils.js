"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBase64ImageFromURL = void 0;
const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            }
            else {
                reject(new Error("Canvas context is null"));
            }
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};
exports.getBase64ImageFromURL = getBase64ImageFromURL;

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const supabase_1 = require("../database/supabase");
const crypto_1 = __importDefault(require("crypto"));
class StorageService {
    /**
     * Uploads a file buffer to Supabase Storage
     * @param bucket Bucket name (invoices, category-icons)
     * @param folder Folder path within the bucket
     * @param file Express file object from multer
     * @returns Public URL of the uploaded file
     */
    static uploadFile(bucket, folder, file) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExt = file.originalname.split('.').pop();
            const randomId = crypto_1.default.randomUUID();
            const fileName = `${folder}/${randomId}.${fileExt}`;
            const { data, error } = yield supabase_1.supabase.storage
                .from(bucket)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });
            if (error) {
                console.error('Supabase Storage Error:', error);
                throw new Error(`Failed to upload file to ${bucket}`);
            }
            const { data: publicUrlData } = supabase_1.supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
            return publicUrlData.publicUrl;
        });
    }
}
exports.StorageService = StorageService;

// Cho TypeScript biết import file .css (vd: import "./globals.css") là hợp lệ.
// TypeScript 6 (bản VS Code đang dùng) bật mặc định `noUncheckedSideEffectImports`
// nên nếu không khai báo dòng này sẽ báo lỗi TS2882 ở src/app/layout.tsx.
declare module "*.css";

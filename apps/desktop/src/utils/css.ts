/**
 * No-op function to let editors highlight as CSS
 */
export default function css(arr: TemplateStringsArray): string {
    return arr.join("");
}

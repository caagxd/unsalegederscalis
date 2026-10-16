// PDF.js yalnızca gerektiğinde yüklenir (ana paketi büyütmesin). Eski iOS sürümleri için "legacy" derleme.
import type { PDFDocumentProxy } from 'pdfjs-dist'

let lib: Promise<typeof import('pdfjs-dist')> | null = null
function load() {
  lib ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]).then(([m, w]) => {
    m.GlobalWorkerOptions.workerSrc = w.default
    return m as unknown as typeof import('pdfjs-dist')
  })
  return lib
}

const docs = new Map<string, Promise<PDFDocumentProxy>>()

/** Aynı PDF bir kez indirilir; sayfa bileşenleri aynı belgeyi paylaşır. */
export function openPdf(url: string, onProgress?: (loaded: number, total: number) => void) {
  let p = docs.get(url)
  if (!p) {
    p = load().then((pdfjs) => {
      const task = pdfjs.getDocument({ url, isEvalSupported: false })
      if (onProgress) task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => onProgress(loaded, total)
      return task.promise
    })
    p.catch(() => docs.delete(url))
    docs.set(url, p)
  }
  return p
}

/** Bir sayfayı verilen CSS genişliğinde, ekran yoğunluğuna uygun çözünürlükte çizer. */
export async function renderPage(doc: PDFDocumentProxy, pageNo: number, canvas: HTMLCanvasElement, cssWidth: number) {
  const page = await doc.getPage(pageNo)
  const base = page.getViewport({ scale: 1 })
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${(cssWidth / base.width) * base.height}px`
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
}

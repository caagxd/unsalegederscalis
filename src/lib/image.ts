// Telefondan çekilen fotoğrafı yüklemeden önce küçültür (≤1600px, JPEG %75).
export async function compressImage(file: File, maxSide = 1600, quality = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  let width: number, height: number, source: CanvasImageSource
  if (bitmap) {
    ;({ width, height } = bitmap)
    source = bitmap
  } else {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await img.decode()
    ;({ naturalWidth: width, naturalHeight: height } = img)
    source = img
  }
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Görüntü işlenemedi'))), 'image/jpeg', quality),
  )
}

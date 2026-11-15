const DATABASE_NAME = 'fieldnova-field-observations'
const STORE_NAME = 'photos'
const MAX_INPUT_BYTES = 12 * 1024 * 1024
const MAX_EDGE = 1600

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('Le stockage photo local n’est pas disponible dans ce navigateur.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Impossible d’ouvrir le stockage photo local.'))
  })
}

function resizedJpeg(file: File) {
  return new Promise<Blob>((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Choisissez une image JPEG, PNG ou WebP.'))
      return
    }
    if (!file.size || file.size > MAX_INPUT_BYTES) {
      reject(new Error('La photo doit peser 12 Mo maximum.'))
      return
    }
    createImageBitmap(file).then(bitmap => {
      const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
      const context = canvas.getContext('2d')
      if (!context) {
        bitmap.close()
        reject(new Error('Cette photo ne peut pas être préparée dans ce navigateur.'))
        return
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('La photo n’a pas pu être convertie.'))
      }, 'image/jpeg', 0.78)
    }).catch(() => reject(new Error('Cette image ne peut pas être lue. Essayez un autre fichier.')))
  })
}

export async function saveFieldObservationPhoto(id: string, file: File) {
  const blob = await resizedJpeg(file)
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put({ id, blob })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Le stockage local est plein ou indisponible.'))
      transaction.onabort = () => reject(new Error('Le stockage local est plein ou indisponible.'))
    })
  } finally {
    database.close()
  }
}

export async function readFieldObservationPhotos(ids: string[]) {
  if (!ids.length) return new Map<string, Blob>()
  const database = await openDatabase()
  try {
    return await new Promise<Map<string, Blob>>((resolve, reject) => {
      const values = new Map<string, Blob>()
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      for (const id of ids) {
        const request = store.get(id)
        request.onsuccess = () => {
          if (request.result?.blob instanceof Blob) values.set(id, request.result.blob)
        }
      }
      transaction.oncomplete = () => resolve(values)
      transaction.onerror = () => reject(new Error('Les photos locales n’ont pas pu être lues.'))
    })
  } finally {
    database.close()
  }
}

export async function deleteFieldObservationPhoto(id: string) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('La photo locale n’a pas pu être supprimée.'))
    })
  } finally {
    database.close()
  }
}

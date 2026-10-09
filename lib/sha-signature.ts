export interface SignatureImageSource {
  id?: number | string;
  imagen_base64?: string | null;
  url_imagen?: string | null;
  firma?: string | null;
}

export function hasSignatureImage(
  signature?: SignatureImageSource | null,
): boolean {
  return Boolean(
    signature?.imagen_base64 || signature?.url_imagen || signature?.firma,
  );
}

export async function resolveShaSignatureImage<T extends SignatureImageSource>(
  signature: T,
  preloadImage: (url: string) => Promise<string>,
): Promise<{ image: string; data: T }> {
  let data = signature;
  if (!hasSignatureImage(data) && data?.id) {
    const response = await fetch(`/api/signatures/${data.id}`);
    if (response.ok) data = await response.json();
  }

  if (data?.imagen_base64) {
    return { image: `data:image/png;base64,${data.imagen_base64}`, data };
  }

  const url = data?.url_imagen || data?.firma;
  return { image: url ? await preloadImage(url) : "", data };
}

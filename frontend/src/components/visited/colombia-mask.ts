/** Misma proporción que src/assets/siluetamapa.png. El marco no depende del zoom. */
export const SILHOUETTE_WIDTH = 1161;
export const SILHOUETTE_HEIGHT = 1354;

/**
 * El PNG es solo el trazo: interior y exterior son transparentes.
 * Esta máscara rellena el interior y el trazo, y deja el exterior transparente,
 * en el mismo lienzo que la imagen.
 */
export function buildColombiaMask(src: string) {
  return new Promise<{ mask: string; border: string }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("No se pudo preparar la silueta."));
        return;
      }
      context.drawImage(image, 0, 0);
      const source = context.getImageData(0, 0, width, height).data;
      const count = width * height;
      const stroke = new Uint8Array(count);
      for (let index = 0; index < count; index += 1) {
        if (source[index * 4 + 3] > 12) {
          stroke[index] = 1;
        }
      }
      const barrier = new Uint8Array(stroke);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (stroke[index]) {
            continue;
          }
          for (let dy = -1; dy <= 1 && !barrier[index]; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nextX = x + dx;
              const nextY = y + dy;
              if (nextX >= 0 && nextY >= 0 && nextX < width && nextY < height && stroke[nextY * width + nextX]) {
                barrier[index] = 1;
                break;
              }
            }
          }
        }
      }
      const exterior = new Uint8Array(count);
      const stack = [0];
      exterior[0] = 1;
      while (stack.length) {
        const index = stack.pop() as number;
        const x = index % width;
        const y = (index / width) | 0;
        const neighbors = [
          x > 0 ? index - 1 : -1,
          x < width - 1 ? index + 1 : -1,
          y > 0 ? index - width : -1,
          y < height - 1 ? index + width : -1,
        ];
        for (const next of neighbors) {
          if (next >= 0 && !exterior[next] && !barrier[next]) {
            exterior[next] = 1;
            stack.push(next);
          }
        }
      }
      const output = context.createImageData(width, height);
      for (let index = 0; index < count; index += 1) {
        if (stroke[index] || (!exterior[index] && !barrier[index])) {
          const offset = index * 4;
          output.data[offset] = 255;
          output.data[offset + 1] = 255;
          output.data[offset + 2] = 255;
          output.data[offset + 3] = 255;
        }
      }
      context.putImageData(output, 0, 0);
      const mask = canvas.toDataURL("image/png");
      const inside = new Uint8Array(count);
      for (let index = 0; index < count; index += 1) {
        if (stroke[index] || (!exterior[index] && !barrier[index])) {
          inside[index] = 1;
        }
      }
      const outerHalo = new Uint8Array(count);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (!barrier[index] || stroke[index]) {
            continue;
          }
          let touchesOutside = false;
          for (let dy = -1; dy <= 1 && !touchesOutside; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nextX = x + dx;
              const nextY = y + dy;
              if (nextX >= 0 && nextY >= 0 && nextX < width && nextY < height && exterior[nextY * width + nextX]) {
                touchesOutside = true;
                break;
              }
            }
          }
          if (touchesOutside) {
            outerHalo[index] = 1;
          }
        }
      }
      const edge = new Uint8Array(count);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (!inside[index]) {
            continue;
          }
          let onEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
          for (let dy = -1; dy <= 1 && !onEdge; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nextX = x + dx;
              const nextY = y + dy;
              if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
                continue;
              }
              const next = nextY * width + nextX;
              if (exterior[next] || outerHalo[next]) {
                onEdge = true;
                break;
              }
            }
          }
          if (onEdge) {
            edge[index] = 1;
          }
        }
      }
      const line = new Uint8Array(edge);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (line[index] || inside[index]) {
            continue;
          }
          let beside = false;
          for (let dy = -1; dy <= 1 && !beside; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nextX = x + dx;
              const nextY = y + dy;
              if (nextX >= 0 && nextY >= 0 && nextX < width && nextY < height && edge[nextY * width + nextX]) {
                beside = true;
                break;
              }
            }
          }
          if (beside) {
            line[index] = 1;
          }
        }
      }
      let strokeLine = line;
      for (let pass = 0; pass < 2; pass += 1) {
        const sealed = new Uint8Array(strokeLine);
        const painted = (x: number, y: number) =>
          x >= 0 && y >= 0 && x < width && y < height && strokeLine[y * width + x] === 1;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (strokeLine[y * width + x]) {
              continue;
            }
            const west = painted(x - 1, y);
            const east = painted(x + 1, y);
            const north = painted(x, y - 1);
            const south = painted(x, y + 1);
            const gap =
              (west && east) ||
              (north && south) ||
              (painted(x - 1, y - 1) && painted(x + 1, y + 1)) ||
              (painted(x + 1, y - 1) && painted(x - 1, y + 1)) ||
              (west && painted(x + 2, y) && !east) ||
              (north && painted(x, y + 2) && !south);
            if (gap) {
              sealed[y * width + x] = 1;
            }
          }
        }
        strokeLine = sealed;
      }
      const solid = new Uint8Array(strokeLine);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (solid[index]) {
            continue;
          }
          const left = x > 0 && strokeLine[index - 1];
          const right = x < width - 1 && strokeLine[index + 1];
          const up = y > 0 && strokeLine[index - width];
          const down = y < height - 1 && strokeLine[index + width];
          if (left || right || up || down) {
            solid[index] = 1;
          }
        }
      }
      strokeLine = solid;
      const borderImage = context.createImageData(width, height);
      for (let index = 0; index < count; index += 1) {
        if (!strokeLine[index]) {
          continue;
        }
        const offset = index * 4;
        borderImage.data[offset] = 28;
        borderImage.data[offset + 1] = 51;
        borderImage.data[offset + 2] = 46;
        borderImage.data[offset + 3] = 255;
      }
      context.putImageData(borderImage, 0, 0);
      resolve({ mask, border: canvas.toDataURL("image/png") });
    };
    image.onerror = () => reject(new Error("No se pudo leer la silueta."));
    image.src = src;
  });
}

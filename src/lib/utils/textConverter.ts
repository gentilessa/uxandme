// plainLabel using regex to remove icon patterns
export const plainLabel = (content: string) => {
  return content.replace(/\[.*?\]/g, "").trim();
}

// get icon from label
export const getIconFromLabel = (content: string) => {
  const match = content.match(/\[(.*?)\]/)?.[1]
  return match ? match : null;
}
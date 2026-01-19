module.exports = (ctx) => {
  // Skip PostCSS processing for node_modules CSS files
  if (ctx.file && ctx.file.includes('node_modules')) {
    return {
      plugins: [],
    };
  }
  
  return {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
}; 
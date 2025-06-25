const axios = require('axios');
const cheerio = require('cheerio');

const scrapeNewsFromSite = async () => {
  try {
    const { data } = await axios.get('https://www.theverge.com/');
    const $ = cheerio.load(data);
    const articles = [];

    $('h2.c-entry-box--compact__title a').each((i, el) => {
      const title = $(el).text();
      const url = $(el).attr('href');
      articles.push({ title, url });
    });

    return articles;
  } catch (error) {
    console.error('Error scraping news:', error.message);
    return [];
  }
};

module.exports = scrapeNewsFromSite;

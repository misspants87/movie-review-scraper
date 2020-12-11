const fs = require('fs');
const redditScraper = require('../model/redditScraper.js');
const browser = require('../browser.js');


const natural = require('natural');
const aposToLexForm = require('apos-to-lex-form');

const SpellCorrector = require('spelling-corrector');
const spellingCorrector = new SpellCorrector();
spellingCorrector.loadDictionary();
const stopwords = require('stopword');

const controller = {
  async scrapeAll(browserInstance, movie) {
    let browser = await browserInstance;
    let review = await redditScraper.scrape(browser, movie);

    // let score = await controller.processValence(review[0], review[1]);
    let score = await controller.processValence(review, movie);
    console.log(`score ${score}`)
    // browser.close();
    return score;
  },

  async processValence(reviews, movie) {
    //remove contractions (e.g. I don't to I do not)
    let lexedReviews = aposToLexForm(reviews).toLowerCase();
    //remove special characters
    let alphaOnlyReview = lexedReviews.replace(/[^a-zA-Z\s]+/g, '')
    //Split text into meaningful units
    let { WordTokenizer } = natural;
    let tokenizer = new WordTokenizer();
    let tokenizedReview = tokenizer.tokenize(alphaOnlyReview);

    //correct spelling mistakes
    tokenizedReview.forEach((word, index) => {
      tokenizedReview[index] = spellingCorrector.correct(word)
    })

    //remove stop words (e.g. but/a/the)
    let meaningfulReview = stopwords.removeStopwords(tokenizedReview);

    //filter out any words from movie title, as well as word 'review'
    let filteredReview = meaningfulReview.filter(review => {
      let keep = true;
      let i = 0;
      let movieSplitName = movie.toLowerCase().split(' ');
      while (keep && i < movie.length) {
        if (review == movieSplitName[i] || review == 'review') {
          keep = false;
        } else {
          ++i;
        }
      }
      return keep;
    })

    //perform the actual analysis
    let {SentimentAnalyzer, PorterStemmer} = natural;
    let analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    let analysis = analyzer.getSentiment(filteredReview);
    //round to first 2 decimals
    analysis = Math.round((analysis + Number.EPSILON) * 100) / 100
    return analysis;

  },
}

module.exports = controller;

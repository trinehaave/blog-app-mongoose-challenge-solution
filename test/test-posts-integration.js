const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models')
const {app, runServer, closeServer} = require('../server')
const {TEST_DATABASE_URL} = require('../config')

chai.use(chaiHttp);



function seedBlogPostData(){
	console.info('seeding blogpost data');
	const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraph()
    });
  }

  return BlogPost.insertMany(seedData);
}



function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogposts API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  })

  describe('GET endpoint', function() {

    it('should return all existing blogposts', function() {
    let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.length.of(count);
        });
    });


    it('should return blogposts with right fields', function() {
      
      let resPosts;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);

          res.body.forEach(function(post){
            post.should.be.a('object');
            post.should.include.keys(
              'id', 'title', 'author', 'created', 'content');
          });
          resPosts = res.body[0];
          return BlogPost.findById(resPosts.id);
        })
        .then(function(post) {

          resPosts.id.should.equal(post.id);
          resPosts.author.should.equal(post.authorName);
          resPosts.title.should.equal(post.title);
          resPosts.content.should.equal(post.content);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new post', function() {

      const newPost = {
          title: faker.lorem.sentence(),
          author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
          },
          content: faker.lorem.text()
      };
     

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'author', 'created', 'content');
          res.body.title.should.equal(newPost.title);
          res.body.id.should.not.be.null;
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
          res.body.content.should.equal(newPost.content);
          

          return BlogPost.findById(res.body.id);
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
           post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {

  
    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion',
        author: {
          firstName: 'foo',
          lastName: 'bar'
        }
      };

      return BlogPost
        .findOne()
        .exec()
        .then(function(post) {
          updateData.id = post.id;
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.title.should.equal(updateData.title);
          res.body.content.should.equal(updateData.content)
          res.body.author.should.equal(`${updateData.author.firstName} ${updateData.author.lastName}`);

          return BlogPost.findById(res.body.id).exec();
        })
        .then(function(post) {
          post.author.firstName.should.equal(updateData.author.firstName);
          post.author.lastName.should.equal(updateData.author.lastName);
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
      });
  });

  describe('DELETE endpoint', function() {
 
    it('delete a post by id', function() {

      let post;

      return BlogPost
        .findOne()
        .exec()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id).exec();
        })
        .then(function(_post) {
    
          should.not.exist(_post);
        });
    });
  });
});

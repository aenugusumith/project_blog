const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const app = express();

// Connecting to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/blog', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const pagesData = new mongoose.Schema({
  title: String,
  desc: String,
  imageName: String,
  imageData: String,
  imageType: String,
});

const pageData = mongoose.model('Page_information', pagesData);

// Setting up views and public folders
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());

app.use(
  session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
  })
);

const User = mongoose.model('admin', {
  username: String,
  password: String,
  admin: Boolean
});

// Add an admin record to the 'admin' collection
// const userRecord = new User({
//   username: 'admin',
//   password: 'admin',
//   admin: true
// });

// userRecord.save()
//   .then(() => {
//     console.log('Admin record added successfully.');
//   })
//   .catch((err) => {
//     console.error('Error adding admin record:', err);
//   });

// For Home page
app.get('/', (req, res) => {
  if (req.session.userLoggedIn) {
    return res.redirect('/dashboard');
  }
  pageData.find() // Fetch all the pages from the database
    .then((pages) => {
      res.render('site', { pages: pages, error: '' });
    })
    .catch((err) => {
      console.log(`Error fetching pages: ${err}`);
      res.render('editpage', { pages: [] });
    });
});

// get login page
app.get('/login', (req, res) => {
  res.render('login');
});

// post login API
app.post('/login', (req, res) => {
  var user = req.body.username;
  var pass = req.body.password;
  console.log(`Username is = ${user}`);
  console.log(`Password is = ${pass}`);
  User.findOne({ username: user, password: pass })
    .then((user) => {
      console.log(`User Object: ${user}`);
      if (user) {
        req.session.username = user.username;
        req.session.userLoggedIn = true;
        res.redirect('/dashboard'); // Redirect to the dashboard after successful login
      } else {
        console.log('Login Failed: Invalid credentials.');
        res.render('login', { error: 'Sorry Login Failed. Please Try Again!' });
      }
    })
    .catch((err) => {
      console.log(`Error: ${err}`);
      res.render('login', { error: 'An error occurred. Please try again.' });
    });
});

// get dashboard page
app.get('/dashboard', (req, res) => {
  if (req.session.userLoggedIn) {
    pageData.find() // Fetching all pages from the database
      .then((pages) => {
        res.render('dashboard', { username: req.session.username, pages: pages, error: '' });
      })
      .catch((err) => {
        console.log(`Error fetching pages: ${err}`);
        res.render('dashboard', { username: req.session.username, pages: [], error: '' });
      });
  } else {
    res.redirect('/login');
  }
});

// get new Page
app.get('/addPage', (req, res) => {
  if (req.session.userLoggedIn) {
    res.render('add');
  } else {
    res.redirect('/login');
  }
});

// post new page 
app.post('/addPage', (req, res) => {
  if (req.session.userLoggedIn) {
    var title = req.body.title
    var desc = req.body.desc;
    var image = req.files.myImage;
    var imageName = image.name;
    var imagePath = 'public/images/' + imageName;
    image.mv(imagePath, (err) => {
      if (err) {
        // displaying errors
        console.log(`Image Error: ${err}`);
        res.status(500).send('Image upload failed.');
      } else {
        // For No errors
        var data = {
          title: title,
          desc: desc,
          imageName: imageName,
          imageData: imagePath,
          imageType: image.mimetype,
        };

        // Saving PageData in the Database
        var myData = new pageData(data);
        myData.save()
          .then(function () {
            console.log('Page data saved in the database!');
            res.redirect('/newPageCreated');
          })
          .catch((err) => {
            console.log('Error saving page data:', err);
            res.status(500).send('Page data save failed.');
          });
      }
    });
  } else {
    res.redirect('/login');
  }
});

// get editpages page
app.get('/editPage', (req, res) => {
  if (req.session.userLoggedIn) {
    pageData.find() // Fetch all pages from the database
      .then((pages) => {
        res.render('editpage', { username: req.session.username, pages: pages });
      })
      .catch((err) => {
        console.log(`Error fetching pages: ${err}`);
        res.render('editpage', { username: req.session.username, pages: [] });
      });
  } else {
    res.redirect('/login');
  }
})

// get edit page
app.get('/edit/:id', (req, res) => {
  if (req.session.userLoggedIn) {
    const pageId = req.params.id;
    pageData.findById(pageId)
      .then((page) => {
        if (page) {
          res.render('edit', { page: page });
        } else {
          res.status(404).send('Page not found.');
        }
      })
      .catch((err) => {
        console.log('Error fetching page data:', err);
        res.status(500).send('Failed to fetch page data.');
      });
  } else {
    res.redirect('/login');
  }
});

// post edit page
app.post('/edit/:id', (req, res) => {
  if (req.session.userLoggedIn) {
    const pageId = req.params.id;
    pageData.findById(pageId)
      .then((page) => {
        if (!page) {
          res.status(404).send('Page not found.');
        } else {
          page.title = req.body.title;
          page.desc = req.body.desc;
          if (req.files && req.files.myImage) {
            const image = req.files.myImage;
            page.imageName = image.name;
            page.ImageData = image.data;
            page.imageType = image.mimetype;
          }

          page.save()
            .then(() => {
              console.log('Page data updated successfully.');
              res.redirect('/editPageSuccess');
            })
            .catch((err) => {
              console.log('Error updating page data:', err);
              res.status(500).send('Page data update failed.');
            });
        }
      })
      .catch((err) => {
        console.log('Error fetching page data:', err);
        res.status(500).send('Failed to fetch page data.');
      });
  } else {
    res.redirect('/login');
  }
});

// additonal routing to display a single page by pageid
app.get('/dashboard/:pageid', (req, res, next) => {
  pageData.findOne({ _id: req.params.pageid })
    .then((data) => {
      pageData.find() // Fetch all pages from the database
        .then((pages) => {
          res.render('adminCreatedPages', { page: data, username: req.session.username, pages: pages, error: '' });
        })
    })
    .catch((err) => {
      console.log(`Error fetching page data: ${err}`);
      res.status(500).send('Failed to fetch page data.');
    });
});

// For deleting a page
app.get('/delete/:id', (req, res) => {
  if (req.session.userLoggedIn) {
    const pageId = req.params.id;
    pageData.findByIdAndDelete(pageId)
      .then(() => {
        console.log('Page deleted successfully.');
        res.redirect('/deletePage');
      })
      .catch((err) => {
        console.log('Error deleting page:', err);
        res.status(500).send('Failed to delete page.');
      });
  } else {
    res.redirect('/login');
  }
});

// adding new page success
app.get('/newPageCreated', (req, res) => {
  if (req.session.userLoggedIn) {
    res.render('newPageSuccess');
  }
});

// editing page success
app.get('/editPageSuccess', (req, res) => {
  if (req.session.userLoggedIn) {
    res.render('editPageSuccess');
  }
});

// deleting page success
app.get('/deletePage', (req, res) => {
  if (req.session.userLoggedIn) {
    res.render('deletePage');
  }
});

//logout
app.get('/logout', (req, res) => {
  req.session.username = '';
  req.session.userLoggedIn = false;
  res.render('logout');
});

// Execute application on Localhost
app.listen(3000, () => {
  console.log('Everything Executed Fine... Open http://localhost:3000/');
});

import {
  Router,
  Request,
  Response
} from 'express';
import {
  FeedItem
} from '../models/FeedItem';
import {
  NextFunction
} from 'connect';
import * as jwt from 'jsonwebtoken';
import * as AWS from '../../../../aws';
import * as c from '../../../../config/config';
import {
  genID
} from '../../../../utils/genID';


const router: Router = Router();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers || !req.headers.authorization) {
    return res.status(401).send({
      message: 'No authorization headers.'
    });
  }

  const tokenBearer = req.headers.authorization.split(' ');
  if (tokenBearer.length != 2) {
    return res.status(401).send({
      message: 'Malformed token.'
    });
  }

  const token = tokenBearer[1];
  return jwt.verify(token, c.config.jwt.secret, (err, decoded) => {
    if (err) {
      return res.status(500).send({
        auth: false,
        message: 'Failed to authenticate.'
      });
    }
    return next();
  });
}

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
  //logging request Time
  let reqID = await genID();
  console.log(new Date().toLocaleString() + `: ${reqID} - request Made get all feeds`);

  const items = await FeedItem.findAndCountAll({
    order: [
      ['id', 'DESC']
    ]
  });
  items.rows.map((item) => {
    if (item.url) {
      item.url = AWS.getGetSignedUrl(item.url);
    }
  });
  // loging response
  console.log(new Date().toLocaleString() + `: ${reqID} - request completed all feeds sent`);
  res.send(items);
});

// Get a feed resource
router.get('/:id',
  async (req: Request, res: Response) => {
    
    //logging request Time
    let reqID = await genID();
    console.log(new Date().toLocaleString() + `: ${reqID} - request Made to get specific feed with id ${req.params.id}`);

    const {
      id
    } = req.params;
    const item = await FeedItem.findByPk(id);
    // loging response
    console.log(new Date().toLocaleString() + `: ${reqID} - request completed, specific feed with id ${req.params.id} sent`);
    res.send(item);
  });

// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName',
  requireAuth,
  async (req: Request, res: Response) => {
    //logging request Time
    let reqID = await genID();
    console.log(new Date().toLocaleString() + `: ${reqID} - request get signedurl`);
    const {
      fileName
    } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    // loging response
    console.log(new Date().toLocaleString() + `: ${reqID} - request completed signedurl sent`);
    res.status(201).send({
      url: url
    });
  });

// Create feed with metadata
router.post('/',
  requireAuth,
  async (req: Request, res: Response) => {
    //logging request Time
    let reqID = await genID();
    console.log(new Date().toLocaleString() + `: ${reqID} - request Made to create a posts`);
    const caption = req.body.caption;
    const fileName = req.body.url; // same as S3 key name

    if (!caption) {
      // loging response
      console.log(new Date().toLocaleString() + `: ${reqID} - request with error`);
      return res.status(400).send({
        message: 'Caption is required or malformed.'
      });
    }

    if (!fileName) {
      // loging response
      console.log(new Date().toLocaleString() + `: ${reqID} - request with error `);
      return res.status(400).send({
        message: 'File url is required.'
      });
    }

    const item = await new FeedItem({
      caption: caption,
      url: fileName,
    });

    const savedItem = await item.save();

    savedItem.url = AWS.getGetSignedUrl(savedItem.url);
    // loging response
    console.log(new Date().toLocaleString() + `: ${reqID} - request completed post saved`);
    res.status(201).send(savedItem);
  });

export const FeedRouter: Router = router;
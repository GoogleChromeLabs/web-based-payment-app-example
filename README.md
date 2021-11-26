# payment-request-show

This repository is an example web-based payment app (https://bobbucks.dev) built
with the [Payment Handler API](https://w3c.github.io/payment-handler/).

## Deployment

The app can be deployed as node.js application. In addition, `app.yaml` is
included here for the purposes of deploying on Google App Engine.

### App Engine deployment

Make sure the [Google Cloud SDK](https://cloud.google.com/sdk/install) is
installed.

After configuring your project, simply run the following command to deploy
or update the applications in their respective directories.

`gcloud app deploy --project <your-project>`

The application should now be serving at `<your-project>.appspot.com`.

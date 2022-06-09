const fs = require('fs');
const express = require('express');
const YAML = require('yaml');
const {graphql} = require("@octokit/graphql");
const MarkdownIt = require('markdown-it');

const app = express();
const port = 80;

app.set('view engine', 'pug');

app.get('/module/docs/module.json', async (req, res) => {
    res.send({
        name: "Docs",
        description: "Harmony docs module.",
    });
});

app.get('/module/docs', async (req, res) => {
    res.render('index', {
        html: await render('README.md'),
    });

})

app.get('/module/docs/*', async (req, res) => {
    const filename = req.path.replace('/module/docs/', '');

    res.render('index', {
        html: await render(filename),
    });
})

app.listen(port, () => {
    console.log(`Docs app listening on port ${port}`);
})

async function render(filename) {
    const md = new MarkdownIt();
    const config = getConfig();
    const graphqlWithAuth = graphql.defaults({
        headers: {
            authorization: `token ${config.github.token}`,
        },
    });

    const {repository} = await graphqlWithAuth(`
    {
    repository(owner: "${config.defaults.org}", name: "${config.defaults.name}") {
    object(expression: "${config.defaults.branch}:${config.defaults.directory}/${filename}") {
      ... on Blob {
              text
            }
    }
  }
}
    `);

    let text = null;
    if (repository.object !== null) {
        text = repository.object.text;
    }

    if (text === null) {
        return null;
    }

    return md.render(text);
}

function getConfig() {
    const regex = /\${{[A-Z0-9_]+}}/g;

    let file = fs.readFileSync('/root/.harmony/config/main.yaml', 'utf8');
    for (const match of file.match(regex)) {
        file = file.replace(match, process.env[match.slice(3, -2)] || null)
    }

    return YAML.parse(file);
}

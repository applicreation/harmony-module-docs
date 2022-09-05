const fs = require('fs')
const express = require('express')
const cors = require('cors')
const YAML = require('yaml')
const {graphql} = require('@octokit/graphql')
const MarkdownIt = require('markdown-it')
const harmony = require('./harmony.json')

const app = express()
const port = 80

app.use(cors())

app.set('view engine', 'pug')

app.get('/module/docs/harmony.json', async (req, res) => {
    res.header('Content-Type','application/json')
    res.send(JSON.stringify(harmony))
})

app.get('/module/docs', async (req, res) => {
    const config = getConfig()
    const markdownRepo = config.defaults.org + '/' + config.defaults.name
    const markdownFilename = config.defaults.directory + '/README.md'

    res.render('index', {
        markdownRepo,
        markdownFilename,
        html: await render(markdownFilename),
    })
})

app.get('/module/docs/*', async (req, res) => {
    const config = getConfig()
    const markdownRepo = config.defaults.org + '/' + config.defaults.name
    const markdownFilename = config.defaults.directory + '/' + req.path.replace('/module/docs/', '')

    res.render('index', {
        markdownRepo,
        markdownFilename,
        html: await render(markdownFilename),
    })
})

app.listen(port, () => {
    console.log(`Docs app listening on port ${port}`)
})

async function render(filename) {
    const config = getConfig()
    const md = new MarkdownIt()
    const graphqlWithAuth = graphql.defaults({
        headers: {
            authorization: `token ${config.github.token}`,
        },
    })

    const {repository} = await graphqlWithAuth(`
        {
            repository(owner: "${config.defaults.org}", name: "${config.defaults.name}") {
                object(expression: "${config.defaults.branch}:${filename}") {
                    ... on Blob {
                        text
                    }
                }
            }
        }
    `)

    let text = null
    if (repository.object !== null) {
        text = repository.object.text
    }

    if (text === null) {
        return null
    }

    return md.render(text)
}

function getConfig() {
    const regex = /\${{[A-Z0-9_]+}}/g

    let file = fs.readFileSync('/root/.harmony/config/main.yaml', 'utf8')
    for (const match of file.match(regex)) {
        file = file.replace(match, process.env[match.slice(3, -2)] || null)
    }

    return YAML.parse(file)
}

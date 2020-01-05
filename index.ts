import * as request from "request-promise-native";
import * as jsdom from "jsdom";
import _ from "lodash";
import * as pLimit from "p-limit";
import * as fs from "fs";

async function getPackagistPage(packageName, pageNumber) {
    let baseUrl = 'https://packagist.org/packages/' + packageName + '/dependents';
    let queryString = '?page=' + pageNumber;

    let response = await request.get({
        uri: baseUrl + queryString,
    });

    let root = new jsdom.JSDOM(response);
    let rows = root.window.document.querySelectorAll('li.row');

    let pageData = [];
    rows.forEach((el) => {
        let name = el.querySelector('h4 > a').textContent;
        let downloads = el.querySelector('span.metadata-block').textContent;

        pageData.push({
            name: name,
            downloads: +downloads.replace(/\s+/g, ''),
        })
    });

    return pageData;
}



(async () => {
    let argv = require('minimist')(process.argv.slice(2), {
        string: 'package',
        number: ['start-page', 'last-page'],
        alias: { p: 'package', s: 'start-page', l: 'last-page' }
    });

    const composerPackageName = argv.package;
    const startPage = argv['start-page'] ?? 1;
    const lastPage = argv['last-page'];

    const limit = pLimit.default(10);

    // let pageNumbers = Array(10).fill(1).map((x, y) => x + y);
    let input = _.range(startPage, lastPage + 1).map((p) => limit(getPackagistPage, composerPackageName, p))
    const pages = await Promise.all(input);

    let packages = pages.flat(2).sort((p1, p2) => p2.downloads - p1.downloads)

    fs.writeFileSync('all.json', JSON.stringify(packages))
    fs.writeFileSync('top_100.json', JSON.stringify(_.take(packages, 100)))

})()

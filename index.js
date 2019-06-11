const rp = require('request-promise');
const cheerio = require('cheerio');

const baseURL = 'https://www.just-eat.es';
const searchURL = '/area/36203-vigo/?lat=42.2244512&long=-8.72439110000005';

const getRestaurants = async () => {
    const html = await rp(baseURL + searchURL);
    const restaurantsMap = cheerio('a.mediaElement', html).map(async (i, e) => {
        const link = baseURL + e.attribs.href;
        const infoRestaurant = cheerio('p.infoText.u-clearfix', e).text();
        const cerrado = cheerio('p.infoText', e).text().includes('disponible');

        if (!infoRestaurant.includes('Solo recogida') && !infoRestaurant.includes('Abre') && !cerrado) {
            let costeEntrega, pedidoMinimo;
            let cont = 0;
            infoRestaurant.split(' ').forEach(element => {
                if (element.match(/[0-9 , \.]+/g) && cont === 0) {
                    costeEntrega = Number(element.replace(',', '.'));
                    cont += 1;
                }
                if (element.includes("Gratis") && cont === 0) {
                    costeEntrega = 0;
                    cont += 1;
                }
                if (element.match(/[0-9 , \.]+/g) && cont === 1) {
                    pedidoMinimo = Number(element.replace(',', '.'));
                }
            });

            const precioMinimo = costeEntrega + pedidoMinimo;

            return {
                link,
                precioMinimo
            }
        }
    }).get();
    return Promise.all(restaurantsMap);
};

getRestaurants().then((response) => {
    response.forEach(element => {
        if (element !== undefined) console.log(element)
    });
}).catch((err) => {
    console.log(err)
})
const axios = require('axios');
const rp = require('request-promise');
const cheerio = require('cheerio');

const baseURL = 'https://www.just-eat.es';
const menuURL = '/menu/getproductsformenu?menuId=';
const searchURL = '/area/36203-vigo/?lat=42.2244512&long=-8.72439110000005';
const bebidas = ['agua', 'refresco', 'coca', 'cola', 'vino', 'zumo', 'cerveza', 'combinado', 'nestea', 'fanta', 'kas', 'pepsi'];

const getRestaurants = async () => {
    const html = await rp(baseURL + searchURL);
    const restaurantsMap = cheerio('a.mediaElement', html)
        .map(async (i, e) => {
            const link = baseURL + e.attribs.href;
            const id = Number(e.attribs['data-test-restaurant-id']);
            const infoRestaurant = cheerio('p.infoText.u-clearfix', e).text();
            const cerrado = cheerio('p.infoText', e).text().includes('disponible');

            if (
                !infoRestaurant.includes('Solo recogida') &&
                !infoRestaurant.includes('Abre') &&
                !cerrado
            ) {
                let costeEntrega, pedidoMinimo, menu;
                let cont = 0;
                infoRestaurant.split(' ').forEach(element => {
                    if (element.match(/[0-9 , \.]+/g) && cont === 0) {
                        costeEntrega = Number(element.replace(',', '.'));
                        cont += 1;
                    }
                    if (element.includes('Gratis') && cont === 0) {
                        costeEntrega = Number(element.replace('GratisPedido', '0'));
                        cont += 1;
                    }
                    if (element.match(/[0-9 , \.]+/g) && cont === 1) {
                        pedidoMinimo = Number(element.replace(',', '.'));
                    }
                });

                const minimoTotal = costeEntrega + pedidoMinimo;

                menu = await axios.get(baseURL + menuURL + id)
                    .then(function (response) {
                        let rawMenu = response.data.Menu.products
                            .filter(product => {
                                let isValid = true;
                                if (product.Price === 0) isValid = false;
                                if (product.Name.match(/(vino)/gi)) isValid = false;
                                if (product.Name.match(/\d+\s?(ml|l|cl)/gi)) isValid = false;
                                if (product.Syn.match(/\d+\s?(ml|l|cl)/gi)) isValid = false;
                                if (product.Desc.match(/\d+\s?(ml|l|cl)/gi)) isValid = false;
                                return isValid;
                            });
                        let menu = rawMenu.map(product => {
                            let nombre = product.Name;
                            if (product.Syn !== '') {
                                nombre += ' | ' + product.Syn;
                            }
                            if (product.Desc !== '') {
                                nombre += ' | ' + product.Desc;
                            }
                            return {
                                id: product.Id,
                                Nombre: nombre,
                                Precio: product.Price
                            }
                        });
                        console.log(menu)

                        return menu;
                    })
                    .catch(err => {
                        console.log(err);
                    });

                return {
                    id,
                    link,
                    costeEntrega,
                    pedidoMinimo,
                    minimoTotal,
                    menu
                };
            }
        })
        .get();
    return Promise.all(restaurantsMap);
};

getRestaurants()
    .then(response => {
        const restaurantes = response.filter(element => {
            let isValid = true;
            if (element === undefined) isValid = false;
            if (element !== undefined && element.menu === undefined) isValid = false;
            return isValid;
        });

        if (restaurantes.length > 0) {
            const json = JSON.stringify(restaurantes);
            const fs = require('fs');
            fs.writeFile('./myjsonfile.json', json, 'utf8', function (err) {
                if (err) throw err;
                console.log('complete');
                let random = Math.floor(Math.random() * restaurantes.length);
                console.log('############################################################################################## ' + restaurantes.length + ' | ' + random)
                console.log(restaurantes[random])
            });
        }
    })
    .catch(err => {
        console.log(err);
    });
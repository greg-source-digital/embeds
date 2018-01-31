// Note: this file is pretty much obsolete, but I'm keeping it around for now...

/*
  This function will receive a timeline segment object and should return either a raw HTML element or
  a JQuery element. Add the pause-on-click class to hyperlinks and other elements to automatically pause the player when clicked.
  To see what fields are available on the timeline segment visit http://sourcecore.azurewebsites.net/api/docs#GetTimelineSegment
*/

let comments;
let dataTypesDictionary = {};
let modals = {};
let hiddenDots = {};
let defaultDotFilter = 'brightness(100%) blur(4px) saturate(100%)';
let litUpDotFilter = 'brightness(175%) blur(4px) saturate(325%)';

// TODO: this dot style should be moved to the CSS script tab; it's only here for now so I don't have to switch tabs when editing...
let dotStyle = `
    filter: brightness(100%) blur(4px) saturate(100%);
    position: absolute;
    display: block;
    height: 30px;
    width: 30px;
    line-height: 30px;
    -moz-border-radius: 15px;
    border-radius: 15px;
    opacity: 0.5;`;

/*
Probably won't use this CSS, but the scaling effect was cool...
.dot {
  filter: 'brightness(100%) blur(4px) saturate(100%)';
  transition: all .28s ease-out;
}

.dot:hover {
  filter: 'brightness(500%) blur(4px) saturate(200%)';
  transform: scale(1.2);
}
*/

function init() {
    for (let dt of dataTypes) {
        dataTypesDictionary[dt.id] = dt;
    }
}

function getFieldsForModal(dataObject) {
    let dataType = dataTypesDictionary[dataObject.dataTypeId];
    let fieldsToDisplay = {};

    // go through all fields of the data type checking for the "show on modal" option
    for (let i = 0; i < dataType.fields.length; i++) {
        let field = dataType.fields[i];

        if (field.options.includes('showOnModalExtension')) {
            fieldsToDisplay[field.id] = field;
        }
    }

    return fieldsToDisplay;
}

function getFieldByName(name, dataObject) {
    let dataType = dataTypesDictionary[dataObject.dataTypeId];
    let dataField = null;

    for (let i = 0; i < dataType.fields.length; i++) {
        let field = dataType.fields[i];

        if (field.name == name) {
            dataField = field;
            break;
        }
    }

    return dataField;
}

function onSegmentStarting(seg) {
    // if (seg.dataTypeName == 'comments') {
    //     let commentText = seg.dataObject.data.comments;
    //     comments.html(`<p>${commentText}</p>`);
    // } else if ((seg.dataTypeName == 'product' || seg.dataTypeName == 'costume') && seg.startBounds) {
    //     let product = $("<a class='product' />")
    //         .attr('href', seg.dataObject.data.shoppingLink)
    //         .attr('target', '_blank');
    //
    //     let img = $('<img />').attr('src', seg.dataObject.mainImageUrl);
    //     let name = $(`<p>${seg.dataObject.name}</p>`);
    //
    //     product.append(img);
    //     product.attr('id', seg.id);
    //     product.css({
    //         left: seg.startBounds.ui.x,
    //         top: seg.startBounds.ui.y,
    //     });
    //
    //     $('body').append(product);
    // } else if (seg.dataTypeName == 'hotspot' && seg.startBounds) {
    //     let hotspot = $("<a class='hotspot' />")
    //         .attr('id', seg.id)
    //         .attr('href', seg.dataObject.data.link)
    //         .attr('target', '_blank');
    //
    //     hotspot.css({
    //         left: `${seg.startBounds.ui.x}px`,
    //         top: `${seg.startBounds.ui.y}px`,
    //         width: `${seg.startBounds.ui.width}px`,
    //         height: `${seg.startBounds.ui.height}px`,
    //     });
    //
    //     $('body').append(hotspot);
    // }

    if (seg.startBounds && dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
        //console.log('got here***************************', dataTypesDictionary[seg.dataObject.dataTypeId]);

        let dot = $(`<div class='dot' />`)
            .attr('id', seg.id)
            .attr('onclick', `onDotClick('${seg.id}')`)
            .attr('onmouseenter', `onDotEnter('${seg.id}')`)
            .attr('onmouseleave', `onDotLeave('${seg.id}')`);

        let extendedDotStyles = '' || dotStyle;

        if (dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor) {
            extendedDotStyles += `background-color: ${dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor};`;
        } else {
            extendedDotStyles += `background-color: blue;`;
        }

        dot.attr('style', extendedDotStyles).css({
            left: `${seg.startBounds.ui.x}px`,
            top: `${seg.startBounds.ui.y}px`,
        });

        $('body').append(dot);
    }
}

function onDotEnter(segmentId) {
    $(`#${segmentId}`).css({
        filter: litUpDotFilter,
        transform: 'scale(1.1)', // make the dot a little bigger when the mouse is over it
        transition: 'filter .19s ease, transform .19s ease',
    });
}

function onDotLeave(segmentId) {
    $(`#${segmentId}`).css({
        filter: defaultDotFilter,
        transform: 'scale(1.0)', // restore original size
    });
}

function onDotClick(segmentId) {
    window.sourcePlayer.pause();

    let seg = activeSegmentObjects[segmentId];

    if (!seg) {
        // this would happen if a user clicks on a dot exactly as it's fading out - it will no longer be in activeSegmentObjects (this is
        // because activeSegmentObjects comes from embed.cshtml which wraps all this custom script code - it sees that the segment has ended
        // and removes it from activeSegmentObjects - there's no way for it to know that this script is in the middle of a fade-out)
        return;
    }

    let timelineColor = dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor;
    let fieldsToDisplay = getFieldsForModal(seg.dataObject);
    let modalId = `${segmentId}-modal`;
    let modal = $('<div />').attr('id', modalId);
    let form = $('<form />');

    if (!timelineColor) {
        timelineColor = 'blue';
    }

    modal.append(form);

    let thumbnailImageURL = seg.dataObject.mainImageUrl;

    if (thumbnailImageURL) {
        let formGroup = $("<div class='form-group' />");
        let innerDiv = $("<div class='col-sm-12' />");
        formGroup.append(innerDiv);
        let thumbnailRootElement = null;

        if (seg.dataTypeName == 'product' || seg.dataTypeName == 'costume') {
            thumbnailRootElement = $('<a />')
                .attr('href', seg.dataObject.data.shoppingLink)
                .attr('target', '_blank');

            let img = $('<img />').attr('src', seg.dataObject.mainImageUrl);

            img.css({
                width: '60px',
                display: 'block',
                margin: '0 auto',
                'box-sizing': 'border-box',
                'max-width': '100%',
                'max-height': '100%',
            });

            thumbnailRootElement.append(img);
        } else {
            thumbnailRootElement = $('<img />')
                .attr('src', seg.dataObject.mainImageUrl)
                .css({
                    width: '60px',
                    display: 'block',
                    margin: '0 auto',
                    'box-sizing': 'border-box',
                    'max-width': '100%',
                    'max-height': '100%',
                });
        }

        //        formGroup.append(thumbnailRootElement);

        // innerDiv.append(thumbnailRootElement);
        // form.append(formGroup);
    }

    let headingText = '';
    let actionURL = '';

    // we are hard-coding some of the data type fields for the demo...
    let hardCodedFields = [];
    console.log('seg.dataTypeName = ', seg.dataTypeName);
    if (seg.dataTypeName == 'castMember') {
        console.log('Using castMember fields...');
        hardCodedFields.push('firstName');
        hardCodedFields.push('lastName');
        hardCodedFields.push('characterName');
        hardCodedFields.push('bio');
        hardCodedFields.push('role');
    } else if (seg.dataTypeName == 'brands' || seg.dataTypeName == 'costumes') {
        console.log('Using brand/costume fields...');
        hardCodedFields.push('name');
        hardCodedFields.push('displayLink');
    } else if (seg.dataTypeName == 'music') {
        console.log('Using music fields...');
        hardCodedFields.push('name');
        hardCodedFields.push('artist');
    } else if (seg.dataTypeName == 'locations') {
        console.log('Using locations fields...');
        hardCodedFields.push('name');
        hardCodedFields.push('address');
        hardCodedFields.push('description');
    }

    if (hardCodedFields.length == 0) {
        for (let fieldId in fieldsToDisplay) {
            let field = fieldsToDisplay[fieldId];
            let fieldType = 'input';

            if (field.options.includes('descriptionField')) {
                fieldType = 'textarea';
            }

            if (field.options.includes('nameField')) {
                headingText = seg.dataObject.name;
            }

            if (field.name == 'actionURL') {
                actionURL = seg.dataObject.data['actionURL'];
                continue;
            }

            let textValue = seg.dataObject.data[field.name];
            //console.log('seg.dataObject.data', seg.dataObject.data);
            let formGroup = $("<div class='form-group' />");
            let label = $(`<label for=${fieldId} />`).html(field.displayName);
            let textInput = $(`<${fieldType} class='form-control' />`)
                .attr('id', fieldId)
                .attr('type', 'text')
                .attr('readonly', true)
                .html(textValue);
            //.attr('placeholder', field.displayName);

            formGroup.append(label);
            formGroup.append(textInput);
            form.append(formGroup);
        }
    } else {
        // the hard-coded stuff for the demo
        for (let i = 0; i < hardCodedFields.length; i++) {
            let field = hardCodedFields[i];
            let fieldType = 'input';

            if (field == 'description') {
                fieldType = 'textarea';
            }

            if (field == 'name') {
                headingText = seg.dataObject.name;
            }

            if (field == 'shoppingLink') {
                actionURL = seg.dataObject.data['shoppingLink'];
                continue;
            }

            let dataField = getFieldByName(field, seg.dataObject);
            let textValue = seg.dataObject.data[field];

            let formGroup = $("<div class='form-group row' />");
            let label = $(`<label for='${dataField.id}' class='col-sm-2 col-form-label col-form-label-sm' />`).html(dataField.displayName);
            let textInput = $("<div class='col-sm-10' />").append(
                $(`<${fieldType} class='form-control form-control-sm' readonly />`)
                    .attr('id', dataField.id)
                    .attr('type', 'text')
                    .attr('placeholder', textValue)
            );

            formGroup.append(label);
            formGroup.append(textInput);
            form.append(formGroup);
        }
    }

    //console.log('dataObject = ', seg.dataObject);
    if (actionURL) {
        //let formGroup = $("<div class='form-group row' />");
        //formGroup.append($('<input class="btn btn-primary" type="submit" value="Go!"/>'));
        //form.append(formGroup);
        form.append($('<input class="btn btn-primary" type="submit" value="Go!"/>'));
        form.attr('action', actionURL).attr('target', '_blank');
    }

    headingText = headingText || '(No Name)';

    let headingDiv = $('<div />');

    headingDiv.css({
        background: timelineColor,
        color: 'white',
        border: `1px solid ${timelineColor}`,
        'font-weight': 'bold',
        'text-align': 'center',
    });

    headingDiv.html(`<p>${headingText}</p>`);
    modal.prepend(headingDiv);

    modal.css({
        left: `${seg.startBounds.ui.x}px`,
        top: `${seg.startBounds.ui.y}px`,
        position: 'absolute',
        border: `1px solid ${timelineColor}`,
        background: '#ddd',
        display: 'none', // this is so it doesn't show immediately when adding it to the DOM, so we can fade-in
        width: '70%',
        //        margin: '0 auto',
        opacity: 0.8, // but we still want a little transparency
    });

    form.css({
        padding: '5px',
    });

    $('body').append(modal);

    let dotElement = $(`#${seg.id}`);

    dotElement.fadeOut('fast');
    modal.fadeIn('slow');

    hiddenDots[seg.id] = dotElement;
    modals[modalId] = modal;
}

function onSegmentEnding(seg) {
    // if (seg.dataTypeName == 'comments') {
    //     comments.empty();
    // } else if (
    //     seg.dataTypeName == 'product' ||
    //     seg.dataTypeName == 'costume' ||
    //     seg.dataTypeName == 'hotspot' ||
    if (dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
        //        $(`#${seg.id}`).remove();
        $(`#${seg.id}`).fadeOut('slow', function() {
            $(`#${seg.id}`).remove();

            if (seg.id in hiddenDots) {
                delete hiddenDots[seg.id];
            }

            $(`#${seg.id}-modal`).remove();
            delete modals[`${seg.id}-modal`];
        });
    }
}

function onVideoClicked() {
    // hide all modals
    for (let modalId in modals) {
        $(`#${modalId}`).remove();
        delete modals[modalId];
    }

    // put the dots back
    for (let invisibleDotId in hiddenDots) {
        hiddenDots[invisibleDotId].fadeIn('slow');
    }

    window.sourcePlayer.play();
}

$(function() {
    init();
});

// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {SchemaItem, SchemaMethod, SchemaParameters} from 'googleapis-common';

export function getObjectType(item: SchemaItem): string {
  if (item.additionalProperties) {
    const valueType = getType(item.additionalProperties);
    return `{ [key: string]: ${valueType}; }`;
  } else if (item.properties) {
    const fields = item.properties;
    const objectType = Object.keys(fields)
      .map(field => `${cleanPropertyName(field)}?: ${getType(fields[field])};`)
      .join(' ');
    return `{ ${objectType} }`;
  } else {
    return 'any';
  }
}

export function isSimpleType(type: string): boolean {
  return !type.includes('{');
}

export function cleanPropertyName(prop: string) {
  const match = prop.match(/[-@.]/);
  return match ? `'${prop}'` : prop;
}

export function camelify(name: string) {
  // If the name has a `-`, remove it and camelize.
  // Ex: `well-known` => `wellKnown`
  if (name.includes('-')) {
    const parts = name.split('-').filter(x => !!x);
    name = parts
      .map((part, i) => {
        if (i === 0) {
          return part;
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('');
  }
  return name;
}

export function getType(item: SchemaItem): string {
  if (item.$ref) {
    return `Schema$${item.$ref}`;
  }
  switch (item.type) {
    case 'integer':
      return 'number';
    case 'object':
      return getObjectType(item);
    case 'array': {
      const innerType = getType(item.items!);
      if (isSimpleType(innerType)) {
        return `${innerType}[]`;
      } else {
        return `Array<${innerType}>`;
      }
    }
    default:
      return item.type!;
  }
}

/**
 * Clean a string of comment tags.
 * @param str - String to process
 * @return Single line string processed
 */
export function cleanComments(str?: string) {
  if (!str) {
    return '';
  }
  // Convert /* into /x and */ into x/
  return str
    .replace(/\*\//g, 'x/')
    .replace(/\/\*/g, '/x')
    .replace(/}/g, '\\}')
    .replace(/>/g, '\\>');
}

export function getPathParams(params: SchemaParameters) {
  const pathParams = new Array<string>();
  if (typeof params !== 'object') {
    params = {};
  }
  Object.keys(params).forEach(key => {
    if (params[key].location === 'path') {
      pathParams.push(key);
    }
  });
  return pathParams;
}

export function getSafeParamName(param: string) {
  if (RESERVED_PARAMS.indexOf(param) !== -1) {
    return param + '_';
  }
  return param;
}

export function hasResourceParam(method: SchemaMethod): boolean {
  return !!method.parameters && !!method.parameters['resource'];
}

const RESERVED_PARAMS = ['resource', 'media', 'auth'];

/**
 * Build a string used to create a URL from the discovery doc provided URL.
 * replace double slashes with single slash (except in https://)
 * @private
 * @param  input URL to build from
 * @return Resulting built URL
 */
export function buildurl(input?: string) {
  return input ? `'${input}'`.replace(/([^:]\/)\/+/g, '$1') : '';
}

/**
 * Attempt to turn a regex into a more human readable form.
 * @param regex pattern for the given parameter
 */
export function unRegex(regex: string): string {
  // example: ^projects/[^/]+$' ==> projects/my-project
  let pattern = regex;
  if (typeof regex !== 'string') {
    return '';
  }
  // remove leading ^
  if (pattern.startsWith('^')) {
    pattern = pattern.slice(1);
  }
  // remove trailing $
  if (pattern.endsWith('$')) {
    pattern = pattern.slice(0, pattern.length - 1);
  }
  // replace projects placeholders
  pattern = pattern.replace(/\^?(\w+)s\/\[\^\/\]\+\$?/g, '$1s/my-$1');
  return pattern;
}

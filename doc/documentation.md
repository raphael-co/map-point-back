Voici la documentation des routes pour la gestion des documentations, y compris la nouvelle route qui renvoie uniquement les titres des documentations :

# Documentation des Routes de Documentation

## Routes pour la Documentation

### 1. Ajouter une Documentation

**URL**: `https://map-point.netgraph.fr/api/documentation/add`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token-admin>`  
- Content-Type: multipart/form-data

**Corps** (FormData):
- title: Titre de la documentation (string)
- documentationFile: Fichier Markdown (fichier)

**Réponse Possible**:

```json
{
    "message": "Documentation added successfully"
}
```

---

### 2. Obtenir toutes les Documentations

**URL**: `https://map-point.netgraph.fr/api/documentation/`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "title": "First Documentation",
        "created_at": "2023-10-01"
    },
    {
        "id": 2,
        "title": "Second Documentation",
        "created_at": "2023-10-02"
    }
]
```

---

### 3. Obtenir une Documentation par ID

**URL**: `https://map-point.netgraph.fr/api/documentation/:id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "id": 1,
    "title": "First Documentation",
    "content": "Contenu de la documentation",
    "created_at": "2023-10-01"
}
```

---

### 4. Mettre à jour une Documentation

**URL**: `https://map-point.netgraph.fr/api/documentation/update/:id`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token-admin>`  
- Content-Type: multipart/form-data

**Corps** (FormData):
- title: Nouveau titre de la documentation (string)
- documentationFile: Nouveau fichier Markdown (facultatif)

**Réponse Possible**:

```json
{
    "message": "Documentation updated successfully"
}
```

---

### 5. Supprimer une Documentation

**URL**: `https://map-point.netgraph.fr/api/documentation/:id`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token-admin>`

**Réponse Possible**:

```json
{
    "message": "Documentation deleted successfully"
}
```

---

### 6. Supprimer plusieurs Documentations

**URL**: `https://map-point.netgraph.fr/api/documentation/delete-multiple`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token-admin>`  
- Content-Type: application/json

**Corps**:

```json
{
    "ids": [1, 2, 3]
}
```

**Réponse Possible**:

```json
{
    "message": "Documentations deleted successfully"
}
```

---

### 7. Obtenir les Titres des Documentations

**URL**: `https://map-point.netgraph.fr/api/documentation/titles`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "title": "First Documentation"
    },
    {
        "id": 2,
        "title": "Second Documentation"
    }
]
```

---

### 8. Obtenir les Documentations avec Pagination

**URL**: `https://map-point.netgraph.fr/api/documentation/with-pagination`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Query Parameters**:  
- page: numéro de la page (par défaut: 1)  
- size: taille de la page (par défaut: 10)  
- search: recherche par titre ou contenu (facultatif)  
- sortColumn: colonne à trier (par défaut: `created_at`)  
- sortOrder: ordre de tri (`ASC` ou `DESC`)

**Réponse Possible**:

```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "title": "Documentation 1",
            "author_id": 123,
            "created_at": "2023-10-01",
            "content": "Content of the documentation"
        }
    ],
    "meta": {
        "totalDocumentations": 100,
        "totalPages": 10,
        "currentPage": 1,
        "pageSize": 10
    }
}
```

---

### Notes
- Les routes nécessitent une authentification via un **token** pour garantir l'accès sécurisé.
- Les routes de type **POST**, **PUT**, et **DELETE** nécessitent un token d'**administrateur** pour les actions de création, modification et suppression.

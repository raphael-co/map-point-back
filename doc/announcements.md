# Documentation des Routes des Annonces

## Routes pour les Annonces

### 1. Ajouter une Annonce

**URL**: `https://map-point.netgraph.fr/api/announcements/add`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: multipart/form-data

**Corps** (FormData):

- title: Titre de l'annonce (string)
- announcementFile: Fichier Markdown (fichier)

**Réponse Possible**:

```json
{
    "message": "Announcement added successfully"
}
```

---

### 2. Obtenir toutes les Annonces

**URL**: `https://map-point.netgraph.fr/api/announcements/`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "title": "First Announcement",
        "created_at": "2023-10-01"
    },
    {
        "id": 2,
        "title": "Second Announcement",
        "created_at": "2023-10-02"
    }
]
```

---

### 3. Obtenir une Annonce par ID

**URL**: `https://map-point.netgraph.fr/api/announcements/:id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "id": 1,
    "title": "First Announcement",
    "content": "Contenu de l'annonce",
    "created_at": "2023-10-01"
}
```

---

### 4. Mettre à jour une Annonce

**URL**: `https://map-point.netgraph.fr/api/announcements/update/:id`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: multipart/form-data

**Corps** (FormData):

- title: Titre mis à jour de l'annonce (string)
- announcementFile: Nouveau fichier Markdown (facultatif)

**Réponse Possible**:

```json
{
    "message": "Announcement updated successfully"
}
```

---

### 5. Supprimer une Annonce

**URL**: `https://map-point.netgraph.fr/api/announcements/:id`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "message": "Announcement deleted successfully"
}
```

---

### 6. Supprimer plusieurs Annonces

**URL**: `https://map-point.netgraph.fr/api/announcements/delete-multiple`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
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
    "message": "Announcements deleted successfully"
}
```

---

## Routes pour les Annonces avec Pagination

### 1. Obtenir les Annonces avec Pagination

**URL**: `https://map-point.netgraph.fr/api/announcements/with-pagination`  
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
            "title": "Announcement 1",
            "author_id": 123,
            "created_at": "2023-10-01",
            "content": "Content of the announcement"
        }
    ],
    "meta": {
        "totalAnnouncements": 100,
        "totalPages": 10,
        "currentPage": 1,
        "pageSize": 10
    }
}
```
---

## Explications Générales

1. **Ajouter une Annonce** : Un administrateur peut ajouter une nouvelle annonce en fournissant un titre et un fichier en format Markdown qui contient le contenu de l'annonce. Le fichier est envoyé sous forme de données multipart/form-data.
  
2. **Obtenir toutes les Annonces** : Permet de récupérer la liste de toutes les annonces créées. Chaque annonce contient des informations basiques telles que l'ID, le titre et la date de création.
  
3. **Obtenir une Annonce par ID** : Permet de récupérer les détails complets d'une annonce spécifique, y compris son contenu.

4. **Mettre à jour une Annonce** : Un administrateur peut mettre à jour une annonce existante, avec un nouveau titre ou un nouveau fichier Markdown. Si aucun fichier n'est fourni, l'ancien contenu est conservé.

5. **Supprimer une Annonce** : Permet à un administrateur de supprimer une annonce spécifique via son ID.

6. **Supprimer plusieurs Annonces** : Permet la suppression de plusieurs annonces simultanément en fournissant une liste d'IDs.

7. **Obtenir les Annonces avec Pagination** : Cette route permet de récupérer des annonces avec un système de pagination. Il est possible de trier et de rechercher dans les titres et contenus des annonces, tout en personnalisant le tri et l'ordre.


Chaque route nécessite un jeton JWT valide à passer dans le header d'autorisation pour authentifier l'utilisateur.
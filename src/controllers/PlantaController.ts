import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

export const createPlanta = async (req: Request, res: Response) => {
    try {
        const { nome, luminosidade, petFriendly, especie, preco, estoque, regaACadaDias } = req.body;
        
        if (!nome || !luminosidade || petFriendly === undefined || !especie || preco === undefined || estoque === undefined || regaACadaDias === undefined) {
            return res.status(400).json({ message: "Dados incompletos para criar planta" });
        }
        
        if (!Number.isInteger(preco)) {
            return res.status(400).json({ message: "O preço deve ser um número inteiro." });
        }

        if (preco <= 0) {
            return res.status(400).json({ message: "O preço deve ser maior que zero." });
        }

        if (!Number.isInteger(estoque)) {
            return res.status(400).json({ message: "O estoque deve ser um número inteiro." });
        }

        if (estoque < 0) {
            return res.status(400).json({ message: "O estoque não pode ser negativo." });
        }

        if (!Number.isInteger(regaACadaDias)) {
            return res.status(400).json({ message: "O campo 'regaACadaDias' deve ser um número inteiro." });
        }

        if (regaACadaDias < 1) {
            return res.status(400).json({ message: "O campo 'regaACadaDias' deve ser pelo menos 1." });
        }

        if (typeof nome !== "string" || typeof especie !== "string") {
            return res.status(400).json({ message: "Os campos 'nome' e 'especie' devem ser strings." });
        }

        if (typeof petFriendly !== "boolean") {
            return res.status(400).json({ message: "O campo 'petFriendly' deve ser um valor booleano." });
        }

        if (!Object.values(Luminosidade).includes(luminosidade)) {
            return res.status(400).json({ message: "Luminosidade inválida. Deve ser 'SOMBRA', 'MEIA_SOMBRA' ou 'SOL_PLENO'" });
        }

        const planta = await PlantaRepository.createPlanta({ nome, luminosidade, petFriendly, especie, preco, estoque, regaACadaDias });
        return res.status(201).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao criar planta" });
    }
};

export const readPlantaById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ message: "O id deve ser um número inteiro." });
        }

        const planta = await PlantaRepository.findPlantaById(id);

        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        return res.status(200).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar planta." });
    }
};

export const readAllPlantas = async (req: Request, res: Response) => {
    try {
        const { luminosidade, petFriendly } = req.query;

        const filtros: { luminosidade?: Luminosidade; petFriendly?: boolean } = {};

        if (luminosidade !== undefined) {
            if (!Object.values(Luminosidade).includes(luminosidade as Luminosidade)) {
                return res.status(400).json({ message: "Luminosidade inválida. Deve ser 'SOMBRA', 'MEIA_SOMBRA' ou 'SOL_PLENO'" });
            }
            filtros.luminosidade = luminosidade as Luminosidade;
        }

        if (petFriendly !== undefined) {
            if (petFriendly !== "true" && petFriendly !== "false") {
                return res.status(400).json({ message: "O filtro 'petFriendly' deve ser 'true' ou 'false'." });
            }
            
            filtros.petFriendly = petFriendly === "true";
        }

        const plantas = await PlantaRepository.findAllPlantas(filtros);
        return res.status(200).json(plantas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar plantas." });
    }
};
